/**
 * Unit tests for ProjectsService.
 *
 * Covers CRUD, status transition validation, archive, delete,
 * member management (add, update role, remove), and the last-manager
 * guard. Uses direct instantiation with manual mocks (Vitest).
 *
 * See docs/features/projects.md and PROJECT_RULES.md §9 (Testing Rules).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DomainException } from '../../common/exceptions/domain.exception';
import { ProjectsService } from './projects.service';
import { ProjectRole, ProjectStatus, Role, ErrorCode } from '@constructtrack/types';
import type { AuthContext } from '../../common/authorization/authorization.types';

// ---------------------------------------------------------------------------
// Mock Factories
// ---------------------------------------------------------------------------

function mockProjectRepository() {
  return {
    exists: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function mockProjectMemberRepository() {
  return {
    create: vi.fn(),
    findByProject: vi.fn(),
    findByProjectAndUser: vi.fn(),
    findByUser: vi.fn(),
    updateRole: vi.fn(),
    remove: vi.fn(),
    countManagers: vi.fn(),
  };
}

function mockAuditService() {
  return {
    record: vi.fn(),
  };
}

function mockMembershipRepository() {
  return {
    exists: vi.fn().mockResolvedValue(true),
  };
}

function mockAuthorizationService() {
  return {
    accessibleProjectIds: vi.fn(),
    assertProjectAccess: vi.fn(),
    assertProjectManager: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_AUTH: AuthContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  role: Role.PROJECT_MANAGER,
};

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    tenantId: 'tenant-1',
    code: 'PRJ1',
    name: 'Test Project',
    status: ProjectStatus.PLANNING,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    tenantId: 'tenant-1',
    projectId: 'proj-1',
    userId: 'user-2',
    role: ProjectRole.ENGINEER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectsService', () => {
  let projectRepo: ReturnType<typeof mockProjectRepository>;
  let memberRepo: ReturnType<typeof mockProjectMemberRepository>;
  let membershipRepo: ReturnType<typeof mockMembershipRepository>;
  let auditService: ReturnType<typeof mockAuditService>;
  let authzService: ReturnType<typeof mockAuthorizationService>;
  let service: ProjectsService;

  beforeEach(() => {
    projectRepo = mockProjectRepository();
    memberRepo = mockProjectMemberRepository();
    membershipRepo = mockMembershipRepository();
    auditService = mockAuditService();
    authzService = mockAuthorizationService();

    // Default to allow all auth checks. Tests can override if testing authz failures.
    authzService.accessibleProjectIds.mockResolvedValue(null);
    authzService.assertProjectAccess.mockResolvedValue(undefined);
    authzService.assertProjectManager.mockResolvedValue(undefined);

service = new ProjectsService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      membershipRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auditService as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authzService as any,
    );
  });

  // =========================================================================
  // create
  // =========================================================================

  describe('create', () => {
    it('creates a project, assigns admin role to creator, and records audit log', async () => {
      projectRepo.exists.mockResolvedValue(false);
      projectRepo.create.mockResolvedValue(makeProject());

      const result = await service.create(MOCK_AUTH, {
        code: 'PRJ1',
        name: 'Test Project',
      });

      expect(projectRepo.create).toHaveBeenCalledWith('tenant-1', {
        code: 'PRJ1',
        name: 'Test Project',
        description: undefined,
        phase: undefined,
        startDate: undefined,
        endDate: undefined,
        budgetCents: undefined,
        location: undefined,
        createdBy: 'user-1',
      });
      expect(memberRepo.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectRole.ADMIN,
      });
      expect(auditService.record).toHaveBeenCalledOnce();
      expect(result.id).toBe('proj-1');
    });

    it('throws ConflictException if code is already taken', async () => {
      projectRepo.exists.mockResolvedValue(true);
      await expect(
        service.create(MOCK_AUTH, { code: 'PRJ1', name: 'Test' }),
      ).rejects.toThrow(DomainException);
    });
  });

  // =========================================================================
  // find
  // =========================================================================

  describe('find', () => {
    it('applies accessible project IDs if restricted', async () => {
      authzService.accessibleProjectIds.mockResolvedValue(['proj-1', 'proj-2']);
      projectRepo.find.mockResolvedValue({ items: [], totalItems: 0, page: 1, perPage: 20, totalPages: 0 });

      await service.find(MOCK_AUTH, { status: ProjectStatus.ACTIVE }, { page: 1, perPage: 20 });

      expect(projectRepo.find).toHaveBeenCalledWith(
        'tenant-1',
        { status: ProjectStatus.ACTIVE, _id: { $in: ['proj-1', 'proj-2'] } },
        { page: 1, perPage: 20 }
      );
    });
  });

  // =========================================================================
  // findById
  // =========================================================================

  describe('findById', () => {
    it('returns the project if found', async () => {
      projectRepo.findById.mockResolvedValue(makeProject());
      const result = await service.findById(MOCK_AUTH, 'proj-1');
      expect(authzService.assertProjectAccess).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(result.id).toBe('proj-1');
    });

    it('throws NotFoundException if project does not exist', async () => {
      projectRepo.findById.mockResolvedValue(null);
      await expect(
        service.findById(MOCK_AUTH, 'invalid'),
      ).rejects.toThrow(DomainException);
    });
  });

  // =========================================================================
  // update + status transitions
  // =========================================================================

  describe('update', () => {
    it('updates project fields and records audit log', async () => {
      projectRepo.findById.mockResolvedValue(makeProject());
      projectRepo.update.mockResolvedValue(makeProject({ name: 'Updated' }));

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        name: 'Updated',
      });

      expect(authzService.assertProjectManager).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(projectRepo.update).toHaveBeenCalledWith('tenant-1', 'proj-1', {
        name: 'Updated',
      });
      expect(auditService.record).toHaveBeenCalledOnce();
      expect(result.name).toBe('Updated');
    });

    it('allows valid status transition: planning → active', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.PLANNING }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        status: ProjectStatus.ACTIVE,
      });

      expect(result.status).toBe(ProjectStatus.ACTIVE);
    });

    it('allows valid status transition: active → on_hold', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.ON_HOLD }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        status: ProjectStatus.ON_HOLD,
      });

      expect(result.status).toBe(ProjectStatus.ON_HOLD);
    });

    it('allows valid status transition: active → completed', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.COMPLETED }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        status: ProjectStatus.COMPLETED,
      });

      expect(result.status).toBe(ProjectStatus.COMPLETED);
    });

    it('allows valid status transition: on_hold → active (resume)', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ON_HOLD }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        status: ProjectStatus.ACTIVE,
      });

      expect(result.status).toBe(ProjectStatus.ACTIVE);
    });

    it('allows valid status transition: planning → completed', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.PLANNING }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.COMPLETED }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        status: ProjectStatus.COMPLETED,
      });

      expect(result.status).toBe(ProjectStatus.COMPLETED);
    });

    it('allows valid status transition: on_hold → completed', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ON_HOLD }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.COMPLETED }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        status: ProjectStatus.COMPLETED,
      });

      expect(result.status).toBe(ProjectStatus.COMPLETED);
    });

    it('rejects invalid transition: completed → active', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.COMPLETED }),
      );

      await expect(
        service.update(MOCK_AUTH, 'proj-1', {
          status: ProjectStatus.ACTIVE,
        }),
      ).rejects.toThrow(DomainException);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    it('rejects invalid transition: archived → any', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ARCHIVED }),
      );

      await expect(
        service.update(MOCK_AUTH, 'proj-1', {
          status: ProjectStatus.ACTIVE,
        }),
      ).rejects.toThrow(DomainException);
    });

    it('allows updating other fields without changing status', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE, name: 'Renamed' }),
      );

      const result = await service.update(MOCK_AUTH, 'proj-1', {
        name: 'Renamed',
      });

      expect(result.name).toBe('Renamed');
    });

    it('throws NotFoundException if project does not exist on update', async () => {
      projectRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(MOCK_AUTH, 'invalid', { name: 'X' }),
      ).rejects.toThrow(DomainException);
    });
  });

  // =========================================================================
  // archive
  // =========================================================================

  describe('archive', () => {
    it('archives a completed project', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.COMPLETED }),
      );
      projectRepo.update.mockResolvedValue(
        makeProject({ status: ProjectStatus.ARCHIVED }),
      );

      const result = await service.archive(MOCK_AUTH, 'proj-1');

      expect(authzService.assertProjectManager).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(projectRepo.update).toHaveBeenCalledWith('tenant-1', 'proj-1', {
        status: ProjectStatus.ARCHIVED,
      });
      expect(auditService.record).toHaveBeenCalledOnce();
      expect(result.status).toBe(ProjectStatus.ARCHIVED);
    });

    it('rejects archiving a planning project', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.PLANNING }),
      );

      await expect(
        service.archive(MOCK_AUTH, 'proj-1'),
      ).rejects.toThrow(DomainException);
    });

    it('rejects archiving an active project', async () => {
      projectRepo.findById.mockResolvedValue(
        makeProject({ status: ProjectStatus.ACTIVE }),
      );

      await expect(
        service.archive(MOCK_AUTH, 'proj-1'),
      ).rejects.toThrow(DomainException);
    });
  });

  // =========================================================================
  // delete
  // =========================================================================

  describe('delete', () => {
    it('hard-deletes a project and records audit log', async () => {
      projectRepo.findById.mockResolvedValue(makeProject());
      projectRepo.delete.mockResolvedValue(true);

      await service.delete(MOCK_AUTH, 'proj-1');

      expect(authzService.assertProjectManager).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(projectRepo.delete).toHaveBeenCalledWith('tenant-1', 'proj-1');
      expect(auditService.record).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException if project does not exist', async () => {
      projectRepo.findById.mockResolvedValue(null);

      await expect(
        service.delete(MOCK_AUTH, 'invalid'),
      ).rejects.toThrow(DomainException);
    });
  });

  // =========================================================================
  // listMembers
  // =========================================================================

  describe('listMembers', () => {
    it('returns all members of a project', async () => {
      const members = [makeMember(), makeMember({ userId: 'user-3' })];
      memberRepo.findByProject.mockResolvedValue(members);

      const result = await service.listMembers(MOCK_AUTH, 'proj-1');

      expect(authzService.assertProjectAccess).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(result).toHaveLength(2);
      expect(memberRepo.findByProject).toHaveBeenCalledWith('tenant-1', 'proj-1');
    });
  });

  // =========================================================================
  // addMember
  // =========================================================================

  describe('addMember', () => {
    it('adds a member to a project', async () => {
      projectRepo.findById.mockResolvedValue(makeProject());
      memberRepo.findByProjectAndUser.mockResolvedValue(null);
      memberRepo.create.mockResolvedValue(makeMember());

      const result = await service.addMember(
        MOCK_AUTH,
        'proj-1',
        'user-2',
        ProjectRole.ENGINEER,
      );

      expect(authzService.assertProjectManager).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(memberRepo.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        projectId: 'proj-1',
        userId: 'user-2',
        role: ProjectRole.ENGINEER,
      });
      expect(auditService.record).toHaveBeenCalledOnce();
      expect(result.userId).toBe('user-2');
    });

    it('throws ConflictException if user is already a member', async () => {
      projectRepo.findById.mockResolvedValue(makeProject());
      memberRepo.findByProjectAndUser.mockResolvedValue(makeMember());

      await expect(
        service.addMember(MOCK_AUTH, 'proj-1', 'user-2', ProjectRole.ENGINEER),
      ).rejects.toThrow(DomainException);
    });

    it('throws NotFoundException if project does not exist', async () => {
      projectRepo.findById.mockResolvedValue(null);

      await expect(
        service.addMember(MOCK_AUTH, 'invalid', 'user-2', ProjectRole.ENGINEER),
      ).rejects.toThrow(DomainException);
    });

    it('rejects adding a user who is not a member of the organization (cross-org prevention)', async () => {
      projectRepo.findById.mockResolvedValue(makeProject());
      membershipRepo.exists.mockResolvedValue(false);

      await expect(
        service.addMember(MOCK_AUTH, 'proj-1', 'user-megabuild', ProjectRole.ENGINEER),
      ).rejects.toMatchObject({ errorCode: ErrorCode.ORG_MEMBERSHIP_REQUIRED });
      expect(memberRepo.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateMemberRole
  // =========================================================================

  describe('updateMemberRole', () => {
    it('updates a member role and records audit log', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(makeMember());
      memberRepo.updateRole.mockResolvedValue(
        makeMember({ role: ProjectRole.MANAGER }),
      );

      const result = await service.updateMemberRole(
        MOCK_AUTH,
        'proj-1',
        'user-2',
        ProjectRole.MANAGER,
      );

      expect(authzService.assertProjectManager).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(result.role).toBe(ProjectRole.MANAGER);
      expect(auditService.record).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException if member does not exist', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(
          MOCK_AUTH,
          'proj-1',
          'user-99',
          ProjectRole.VIEWER,
        ),
      ).rejects.toThrow(DomainException);
    });

    it('prevents demoting the last manager/admin', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(
        makeMember({ role: ProjectRole.ADMIN }),
      );
      memberRepo.countManagers.mockResolvedValue(1);

      await expect(
        service.updateMemberRole(
          MOCK_AUTH,
          'proj-1',
          'user-2',
          ProjectRole.VIEWER,
        ),
      ).rejects.toThrow(DomainException);
    });

    it('allows demoting a manager when there are other managers', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(
        makeMember({ role: ProjectRole.ADMIN }),
      );
      memberRepo.countManagers.mockResolvedValue(2);
      memberRepo.updateRole.mockResolvedValue(
        makeMember({ role: ProjectRole.VIEWER }),
      );

      const result = await service.updateMemberRole(
        MOCK_AUTH,
        'proj-1',
        'user-2',
        ProjectRole.VIEWER,
      );

      expect(result.role).toBe(ProjectRole.VIEWER);
    });
  });

  // =========================================================================
  // removeMember
  // =========================================================================

  describe('removeMember', () => {
    it('removes a member and records audit log', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(makeMember());
      memberRepo.remove.mockResolvedValue(true);

      await service.removeMember(MOCK_AUTH, 'proj-1', 'user-2');

      expect(authzService.assertProjectManager).toHaveBeenCalledWith(MOCK_AUTH, 'tenant-1', 'proj-1');
      expect(memberRepo.remove).toHaveBeenCalledWith('tenant-1', 'proj-1', 'user-2');
      expect(auditService.record).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException if member does not exist', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        service.removeMember(MOCK_AUTH, 'proj-1', 'user-99'),
      ).rejects.toThrow(DomainException);
    });

    it('prevents removing the last manager/admin', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(
        makeMember({ role: ProjectRole.MANAGER }),
      );
      memberRepo.countManagers.mockResolvedValue(1);

      await expect(
        service.removeMember(MOCK_AUTH, 'proj-1', 'user-2'),
      ).rejects.toThrow(DomainException);
    });

    it('allows removing a manager when there are other managers', async () => {
      memberRepo.findByProjectAndUser.mockResolvedValue(
        makeMember({ role: ProjectRole.MANAGER }),
      );
      memberRepo.countManagers.mockResolvedValue(2);
      memberRepo.remove.mockResolvedValue(true);

      await service.removeMember(MOCK_AUTH, 'proj-1', 'user-2');

      expect(memberRepo.remove).toHaveBeenCalledWith('tenant-1', 'proj-1', 'user-2');
    });
  });
});

