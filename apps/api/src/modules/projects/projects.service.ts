import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { ProjectRepository } from './repositories/project.repository';
import type { ProjectCreateInput } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { MembershipRepository } from '../auth/repositories/membership.repository';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import type { AuthContext } from '../../common/authorization/authorization.types';
import {
  ProjectDomain,
  ProjectMemberDomain,
  ProjectStatus,
  ProjectRole,
  EntityId,
  PaginationOptions,
  PaginatedResponse,
} from '@constructtrack/types';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

// ---------------------------------------------------------------------------
// Status Transition Map — defines which transitions are legal.
// See docs/features/projects.md → Lifecycle & States.
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: ReadonlyMap<ProjectStatus, ReadonlySet<ProjectStatus>> = new Map([
  [ProjectStatus.PLANNING, new Set([ProjectStatus.ACTIVE, ProjectStatus.COMPLETED])],
  [ProjectStatus.ACTIVE, new Set([ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED])],
  [ProjectStatus.ON_HOLD, new Set([ProjectStatus.ACTIVE, ProjectStatus.COMPLETED])],
  [ProjectStatus.COMPLETED, new Set([ProjectStatus.ARCHIVED])],
  [ProjectStatus.ARCHIVED, new Set<ProjectStatus>()],
]);

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly memberRepo: ProjectMemberRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly auditService: AuditService,
    private readonly authzService: AuthorizationService,
  ) {}

  // -------------------------------------------------------------------------
  // Project CRUD
  // -------------------------------------------------------------------------

  async create(auth: AuthContext, data: CreateProjectDto): Promise<ProjectDomain> {
    const exists = await this.projectRepo.exists(auth.tenantId, { code: data.code });
    if (exists) {
      throw new DomainException(ErrorCode.PROJECT_DUPLICATE_CODE, HttpStatus.CONFLICT, `Project code '${data.code}' is already taken.`);
    }

    const createInput: ProjectCreateInput = {
      code: data.code,
      name: data.name,
      description: data.description,
      phase: data.phase,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      budgetCents: data.budgetCents,
      location: data.location,
      managerId: data.managerId,
      createdBy: auth.userId,
    };

    const project = await this.projectRepo.create(auth.tenantId, createInput);

    // Auto-assign the creator as project admin.
    await this.memberRepo.create({
      tenantId: auth.tenantId as string,
      projectId: project.id,
      userId: auth.userId,
      role: ProjectRole.ADMIN,
    });

    // Assign the chosen manager as a project member (if not the creator).
    if (data.managerId && data.managerId !== auth.userId) {
      await this.addMember(auth, project.id, data.managerId, ProjectRole.MANAGER).catch(
        () => {
          // Manager assignment must not block project creation — the
          // managerId is stored on the project regardless.
        },
      );
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_created',
      entityType: 'project',
      entityId: project.id,
      after: project as unknown as Record<string, unknown>,
    });

    return project;
  }

  async find(
    auth: AuthContext,
    filter: Record<string, unknown>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<ProjectDomain>> {
    const accessibleProjectIds = await this.authzService.accessibleProjectIds(
      auth.tenantId,
      auth.userId,
      auth.role,
    );

    if (accessibleProjectIds) {
      filter._id = { $in: accessibleProjectIds };
    }

    return this.projectRepo.find(auth.tenantId, filter, options);
  }

  async findById(auth: AuthContext, id: EntityId): Promise<ProjectDomain> {
    await this.authzService.assertProjectAccess(auth, auth.tenantId, id as string);

    const project = await this.projectRepo.findById(auth.tenantId, id);
    if (!project) {
      throw new DomainException(ErrorCode.PROJECT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project not found.');
    }
    return project;
  }

  async update(
    auth: AuthContext,
    id: EntityId,
    data: UpdateProjectDto,
  ): Promise<ProjectDomain> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, id as string);

    const projectBefore = await this.findById(auth, id);

    // Validate status transition if status is being changed.
    if (data.status && data.status !== projectBefore.status) {
      this.assertValidTransition(projectBefore.status, data.status);
    }

    const updated = await this.projectRepo.update(auth.tenantId, id, data);
    if (!updated) {
      throw new DomainException(ErrorCode.PROJECT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_updated',
      entityType: 'project',
      entityId: id as string,
      before: projectBefore as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Archives a project (soft delete). Sets archivedAt + archivedBy.
   * The project must be in COMPLETED status first.
   */
  async archive(
    auth: AuthContext,
    id: EntityId,
  ): Promise<ProjectDomain> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, id as string);

    const project = await this.findById(auth, id);

    this.assertValidTransition(project.status, ProjectStatus.ARCHIVED);

    const updated = await this.projectRepo.update(auth.tenantId, id, {
      status: ProjectStatus.ARCHIVED,
    });
    if (!updated) {
      throw new DomainException(ErrorCode.PROJECT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_archived',
      entityType: 'project',
      entityId: id as string,
      before: project as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Hard-deletes a project. Admin-only, audit-logged.
   * Per PROJECT_RULES.md §37: no raw deleteMany without approval.
   */
  async delete(
    auth: AuthContext,
    id: EntityId,
  ): Promise<void> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, id as string);

    const project = await this.findById(auth, id);

    const deleted = await this.projectRepo.delete(auth.tenantId, id);
    if (!deleted) {
      throw new DomainException(ErrorCode.PROJECT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_deleted',
      entityType: 'project',
      entityId: id as string,
      before: project as unknown as Record<string, unknown>,
    });
  }

  // -------------------------------------------------------------------------
  // Member Management
  // -------------------------------------------------------------------------

  async listMembers(
    auth: AuthContext,
    projectId: string,
  ): Promise<ProjectMemberDomain[]> {
    await this.authzService.assertProjectAccess(auth, auth.tenantId, projectId);
    return this.memberRepo.findByProject(auth.tenantId, projectId);
  }

  async addMember(
    auth: AuthContext,
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMemberDomain> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);

    // Verify the project exists (also enforces tenant scoping).
    await this.findById(auth, projectId as EntityId);

    // Phase 6 — cross-organization project membership is structurally
    // impossible: the target user must be a member of this organization.
    const isOrgMember = await this.membershipRepo.exists(
      userId,
      auth.tenantId,
    );
    if (!isOrgMember) {
      throw new DomainException(
        ErrorCode.ORG_MEMBERSHIP_REQUIRED,
        HttpStatus.FORBIDDEN,
        'Only organization members can be assigned to a project.',
      );
    }

    // Check the user isn't already a member.
    const existing = await this.memberRepo.findByProjectAndUser(
      auth.tenantId,
      projectId,
      userId,
    );
    if (existing) {
      throw new DomainException(ErrorCode.PROJECT_DUPLICATE_MEMBER, HttpStatus.CONFLICT, 'User is already a member of this project.');
    }

    const member = await this.memberRepo.create({
      tenantId: auth.tenantId as string,
      projectId,
      userId,
      role,
    });

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_member_added',
      entityType: 'project_member',
      entityId: member.id,
      after: { projectId, userId, role },
    });

    return member;
  }

  async updateMemberRole(
    auth: AuthContext,
    projectId: string,
    userId: string,
    newRole: ProjectRole,
  ): Promise<ProjectMemberDomain> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);

    const existing = await this.memberRepo.findByProjectAndUser(
      auth.tenantId,
      projectId,
      userId,
    );
    if (!existing) {
      throw new DomainException(ErrorCode.PROJECT_MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project member not found.');
    }

    const previousRole = existing.role;

    // Prevent demoting the last manager/admin.
    if (this.isManagerRole(previousRole) && !this.isManagerRole(newRole)) {
      const managerCount = await this.memberRepo.countManagers(auth.tenantId, projectId);
      if (managerCount <= 1) {
        throw new DomainException(ErrorCode.PROJECT_LAST_MANAGER, HttpStatus.BAD_REQUEST, 'Cannot demote the last manager/admin of a project.');
      }
    }

    const updated = await this.memberRepo.updateRole(
      auth.tenantId,
      projectId,
      userId,
      newRole,
    );
    if (!updated) {
      throw new DomainException(ErrorCode.PROJECT_MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project member not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_member_role_updated',
      entityType: 'project_member',
      entityId: updated.id,
      before: { role: previousRole },
      after: { role: newRole },
    });

    return updated;
  }

  async removeMember(
    auth: AuthContext,
    projectId: string,
    userId: string,
  ): Promise<void> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);

    const existing = await this.memberRepo.findByProjectAndUser(
      auth.tenantId,
      projectId,
      userId,
    );
    if (!existing) {
      throw new DomainException(ErrorCode.PROJECT_MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project member not found.');
    }

    // Prevent removing the last manager/admin.
    if (this.isManagerRole(existing.role)) {
      const managerCount = await this.memberRepo.countManagers(auth.tenantId, projectId);
      if (managerCount <= 1) {
        throw new DomainException(ErrorCode.PROJECT_LAST_MANAGER, HttpStatus.BAD_REQUEST, 'Cannot remove the last manager/admin of a project.');
      }
    }

    const removed = await this.memberRepo.remove(auth.tenantId, projectId, userId);
    if (!removed) {
      throw new DomainException(ErrorCode.PROJECT_MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project member not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'project_member_removed',
      entityType: 'project_member',
      entityId: existing.id,
      before: { projectId, userId, role: existing.role },
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Validates a status transition against the allowed transition map.
   * Throws BadRequestException if the transition is not allowed.
   */
  private assertValidTransition(
    from: ProjectStatus,
    to: ProjectStatus,
  ): void {
    const allowed = VALID_TRANSITIONS.get(from);
    if (!allowed || !allowed.has(to)) {
      throw new DomainException(ErrorCode.PROJECT_INVALID_STATUS_TRANSITION, HttpStatus.BAD_REQUEST, `Invalid status transition: '${from}' → '${to}'.`);
    }
  }

  private isManagerRole(role: ProjectRole): boolean {
    return role === ProjectRole.MANAGER || role === ProjectRole.ADMIN;
  }
}
