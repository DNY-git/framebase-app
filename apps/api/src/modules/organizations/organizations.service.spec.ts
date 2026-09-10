/**
 * Unit tests for OrganizationsService — multi-tenant organization system
 * (prompt2.txt Phase 14).
 *
 * Mocks the repositories and supporting services to verify business logic:
 *  - organization context resolves from authenticated identity + membership
 *  - active-organization switching requires an existing membership
 *  - member/invitation management requires OWNER/ADMIN
 *  - invitation lifecycle: create, resolve, revoke, accept (new + existing
 *    user), expiry, tampering, duplicate-membership prevention
 *
 * Cross-tenant data isolation for projects is covered in
 * projects.service.spec.ts + the projects module's tenant-scoped repos.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ErrorCode, Role } from '@constructtrack/types';
import type { AppConfig } from '../../config/configuration';
import { InvitationStatus } from '../../schemas/invitation.schema';
import { OrganizationsService } from './organizations.service';
import { PasswordService } from '../auth/password.service';
import type { PasswordStrengthResult } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import type { TokenPair } from '../auth/token.service';
import type { AuthContext } from '../../common/authorization/authorization.types';
import type { InvitationDomain } from './repositories/invitation.repository';

// --- Helpers ---------------------------------------------------------------

function makeAuth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 'user-1',
    tenantId: 'tenant-buildright',
    role: Role.OWNER,
    ...overrides,
  };
}

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1',
    userId: 'user-1',
    tenantId: 'tenant-buildright',
    role: Role.OWNER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-buildright',
    name: 'BuildRight Construction',
    slug: 'buildright',
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'john@gmail.com',
    passwordHash: 'hashed',
    name: 'John',
    status: 'active',
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeInvitation(overrides: Record<string, unknown> = {}): InvitationDomain {
  return {
    id: 'inv-1',
    tenantId: 'tenant-buildright',
    email: 'david@gmail.com',
    role: Role.SITE_ENGINEER,
    token: 'a'.repeat(64),
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usageLimit: null,
    usedCount: 0,
    invitedBy: 'user-1',
    acceptedAt: null,
    acceptedBy: null,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

// --- Mocks -----------------------------------------------------------------

function mockPasswordService() {
  return {
    hash: vi.fn<() => Promise<string>>().mockResolvedValue('hashed-password'),
    validateStrength: vi.fn<() => PasswordStrengthResult>().mockReturnValue({
      valid: true,
      errors: [],
    }),
  };
}

function mockTokenService() {
  return {
    generateTokenPair: vi
      .fn<() => Promise<TokenPair>>()
      .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }),
    verifyAccessToken: vi.fn(),
  };
}

function mockConfigService(): ConfigService<AppConfig, true> {
  return {
    get: <K extends keyof AppConfig>(key: K): AppConfig[K] =>
      (key === 'jwtRefreshTtl'
        ? '7d'
        : key === 'appUrl'
          ? 'http://localhost:5173'
          : '') as AppConfig[K],
  } as ConfigService<AppConfig, true>;
}

function mockRepositories() {
  return {
    tenant: {
      findById: vi.fn(),
      findByIds: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(makeTenant()),
    },
    user: {
      findById: vi.fn().mockResolvedValue(makeUser()),
      findByIds: vi.fn().mockResolvedValue([]),
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(makeUser()),
    },
    membership: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByUserAndTenant: vi.fn().mockResolvedValue(null),
      findByTenant: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(makeMembership()),
      updateRole: vi.fn().mockResolvedValue(makeMembership()),
      delete: vi.fn().mockResolvedValue(true),
      countMembersWithRole: vi.fn().mockResolvedValue(2),
      exists: vi.fn().mockResolvedValue(false),
    },
    session: {
      createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
    },
    invitation: {
      create: vi.fn().mockResolvedValue(makeInvitation()),
      findByToken: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      findPendingByTenantAndEmail: vi.fn().mockResolvedValue(null),
      findByTenant: vi.fn().mockResolvedValue([]),
      markAccepted: vi.fn().mockResolvedValue(makeInvitation()),
      revoke: vi.fn().mockResolvedValue(makeInvitation()),
      revokePendingForEmail: vi.fn().mockResolvedValue(undefined),
      updateExpiryAndLimit: vi.fn().mockResolvedValue(makeInvitation()),
      incrementUsedCount: vi.fn().mockResolvedValue(makeInvitation()),
    },
    audit: { record: vi.fn().mockResolvedValue(undefined) },
  };
}

// --- Tests -----------------------------------------------------------------

describe('OrganizationsService', () => {
  let passwordService: ReturnType<typeof mockPasswordService>;
  let tokenService: ReturnType<typeof mockTokenService>;
  let repos: ReturnType<typeof mockRepositories>;
  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordService = mockPasswordService();
    tokenService = mockTokenService();
    repos = mockRepositories();
    service = new OrganizationsService(
      tokenService as unknown as TokenService,
      passwordService as unknown as PasswordService,
      repos.tenant as never,
      repos.user as never,
      repos.membership as never,
      repos.session as never,
      repos.invitation as never,
      repos.audit as never,
      { sendInvitationEmail: vi.fn().mockResolvedValue({ sent: false, reason: 'not_configured' }) } as never,
      mockConfigService(),
    );
  });

  describe('getContext (Phase 3 — authenticated organization context)', () => {
    it('resolves the active organization from the membership', async () => {
      repos.membership.findByUserId.mockResolvedValue([
        makeMembership({ id: 'm1', tenantId: 'tenant-buildright' }),
        makeMembership({ id: 'm2', tenantId: 'tenant-megabuild' }),
      ]);
      repos.tenant.findByIds.mockResolvedValue([
        makeTenant(),
        makeTenant({ id: 'tenant-megabuild', name: 'MegaBuild Ltd', slug: 'megabuild' }),
      ]);

      const result = await service.getContext(makeAuth());

      expect(result.organization).toEqual({
        id: 'tenant-buildright',
        name: 'BuildRight Construction',
        slug: 'buildright',
        role: Role.OWNER,
      });
      expect(result.memberships).toHaveLength(2);
    });

    it('returns null organization when the user has no memberships', async () => {
      const result = await service.getContext(makeAuth());
      expect(result.organization).toBeNull();
      expect(result.memberships).toEqual([]);
    });
  });

  describe('createOrganization (Phase 4 — multiple organizations)', () => {
    it('creates the tenant, an OWNER membership, and issues tokens', async () => {
      repos.user.findById.mockResolvedValue(makeUser());
      const result = await service.createOrganization(
        makeAuth(),
        'MegaBuild Ltd',
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(repos.tenant.create).toHaveBeenCalledOnce();
      expect(repos.membership.create).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-buildright',
        role: Role.OWNER,
      });
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.created' }),
      );
      expect(result.accessToken).toBe('at');
      expect(result.user?.role).toBe(Role.OWNER);
    });
  });

  describe('switchOrganization (Phase 4 — secure active-organization)', () => {
    it('switches to an organization where the user has a membership', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(
        makeMembership({
          id: 'm-mega',
          tenantId: 'tenant-megabuild',
          role: Role.VIEWER,
        }),
      );
      repos.tenant.findById.mockResolvedValue(
        makeTenant({ id: 'tenant-megabuild', name: 'MegaBuild Ltd' }),
      );
      repos.user.findById.mockResolvedValue(makeUser());

      const result = await service.switchOrganization(
        makeAuth(),
        'tenant-megabuild',
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(result.user?.tenantId).toBe('tenant-megabuild');
      expect(result.user?.role).toBe(Role.VIEWER);
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.switched' }),
      );
    });

    it('rejects switching to an organization without a membership', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(null);

      await expect(
        service.switchOrganization(
          makeAuth(),
          'tenant-megabuild',
          { userAgent: 'vitest', ipAddress: '127.0.0.1' },
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.ORG_MEMBERSHIP_REQUIRED });
    });

    it('rejects switching to a disabled or missing organization', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(makeMembership());
      repos.tenant.findById.mockResolvedValue(null);

      await expect(
        service.switchOrganization(makeAuth(), 'tenant-ghost', {
          userAgent: 'vitest',
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.ORG_NOT_FOUND });
    });
  });

  describe('listMembers (Phase 8 — team)', () => {
    it('rejects non-management roles', async () => {
      await expect(
        service.listMembers(makeAuth({ role: Role.SITE_ENGINEER })),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.FORBIDDEN,
      });
      expect(repos.membership.findByTenant).not.toHaveBeenCalled();
    });

    it('lists members for an OWNER with hydrated user details', async () => {
      repos.membership.findByTenant.mockResolvedValue([
        makeMembership({ userId: 'user-1', role: Role.OWNER }),
        makeMembership({ id: 'm2', userId: 'user-2', role: Role.SITE_ENGINEER }),
      ]);
      repos.user.findByIds.mockResolvedValue([
        makeUser(),
        makeUser({ id: 'user-2', email: 'david@gmail.com', name: 'David' }),
      ]);

      const members = await service.listMembers(makeAuth());

      expect(members).toHaveLength(2);
      expect(members[0]).toMatchObject({
        email: 'david@gmail.com',
        role: Role.SITE_ENGINEER,
      });
      expect(members[1]).toMatchObject({ email: 'john@gmail.com', role: Role.OWNER });
    });
  });

  describe('listDirectory (Phase 6 — project assignment)', () => {
    it('lets a PROJECT_MANAGER view the member directory', async () => {
      repos.membership.findByTenant.mockResolvedValue([
        makeMembership({ userId: 'user-1', role: Role.OWNER }),
        makeMembership({ id: 'm2', userId: 'user-2', role: Role.SITE_ENGINEER }),
      ]);
      repos.user.findByIds.mockResolvedValue([
        makeUser(),
        makeUser({ id: 'user-2', email: 'david@gmail.com', name: 'David' }),
      ]);

      const directory = await service.listDirectory(
        makeAuth({ role: Role.PROJECT_MANAGER }),
      );

      expect(directory).toHaveLength(2);
      expect(directory[0]).toMatchObject({ email: 'david@gmail.com' });
    });

    it('rejects roles below PROJECT_MANAGER', async () => {
      await expect(
        service.listDirectory(makeAuth({ role: Role.VIEWER })),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
      expect(repos.membership.findByTenant).not.toHaveBeenCalled();
    });

    it('rejects SITE_ENGINEER (no project-management powers)', async () => {
      await expect(
        service.listDirectory(makeAuth({ role: Role.SITE_ENGINEER })),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });

  describe('updateMemberRole (Phase 10 — authorization)', () => {
    it('rejects a member changing their own role', async () => {
      await expect(
        service.updateMemberRole(makeAuth(), 'user-1', Role.VIEWER),
      ).rejects.toMatchObject({ errorCode: ErrorCode.MEMBER_SELF_ROLE_CHANGE });
    });

    it('allows an ADMIN to grant non-OWNER roles', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(
        makeMembership({ userId: 'user-2', role: Role.CREW }),
      );
      repos.membership.updateRole.mockResolvedValue(
        makeMembership({ userId: 'user-2', role: Role.PROJECT_MANAGER }),
      );

      const result = await service.updateMemberRole(
        makeAuth({ role: Role.ADMIN }),
        'user-2',
        Role.PROJECT_MANAGER,
      );

      expect(result.role).toBe(Role.PROJECT_MANAGER);
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.member_role_updated' }),
      );
    });

    it('only an OWNER can grant the OWNER role (David cannot make himself owner)', async () => {
      await expect(
        service.updateMemberRole(
          makeAuth({ role: Role.ADMIN }),
          'user-2',
          Role.OWNER,
        ),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.FORBIDDEN,
      });
    });

    it('prevents demoting the last owner/admin', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(
        makeMembership({ userId: 'user-2', role: Role.ADMIN }),
      );
      repos.membership.countMembersWithRole.mockResolvedValue(1);

      await expect(
        service.updateMemberRole(makeAuth(), 'user-2', Role.CREW),
      ).rejects.toMatchObject({ errorCode: ErrorCode.MEMBER_LAST_OWNER });
    });

    it('rejects management actions for non-management roles', async () => {
      await expect(
        service.updateMemberRole(
          makeAuth({ role: Role.PROCUREMENT }),
          'user-2',
          Role.VIEWER,
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });

  describe('removeMember (Phase 10 — authorization)', () => {
    it('rejects removing yourself', async () => {
      await expect(
        service.removeMember(makeAuth(), 'user-1'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.MEMBER_SELF_REMOVE });
    });

    it('removes another member when leadership stays intact', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(
        makeMembership({ userId: 'user-2', role: Role.CREW }),
      );

      await service.removeMember(makeAuth(), 'user-2');

      expect(repos.membership.delete).toHaveBeenCalledWith(
        'user-2',
        'tenant-buildright',
      );
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.member_removed' }),
      );
    });

    it('prevents removing the last owner/admin', async () => {
      repos.membership.findByUserAndTenant.mockResolvedValue(
        makeMembership({ userId: 'user-2', role: Role.ADMIN }),
      );
      repos.membership.countMembersWithRole.mockResolvedValue(1);

      await expect(
        service.removeMember(makeAuth(), 'user-2'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.MEMBER_LAST_OWNER });
    });
  });

  describe('createInvitation (Phase 9 — invitation flow)', () => {
    it('creates a pending invitation with a secure token for the active organization', async () => {
      const result = await service.createInvitation(
        makeAuth(),
        'david@gmail.com',
        Role.SITE_ENGINEER,
      );

      expect(repos.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-buildright',
          email: 'david@gmail.com',
          role: Role.SITE_ENGINEER,
        }),
      );
      expect(result.devAcceptUrl).toMatch(/^http:\/\/localhost:5173\/invitations\//);
      // SMTP not configured in the test env — must report honestly, not fake sent.
      expect(result.emailSent).toBe(false);
      expect(result.emailError).toContain('SMTP is not configured');
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.invitation_created' }),
      );
    });

    it('rejects the OWNER role via invitation', async () => {
      await expect(
        service.createInvitation(makeAuth(), 'david@gmail.com', Role.OWNER),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_INVALID_ROLE });
    });

    it('rejects invitations for users already in the organization', async () => {
      repos.user.findByEmail.mockResolvedValue(makeUser());
      repos.membership.exists.mockResolvedValue(true);

      await expect(
        service.createInvitation(makeAuth(), 'john@gmail.com', Role.CREW),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_ALREADY_MEMBER });
    });

    it('rejects a duplicate pending invitation for the same email', async () => {
      repos.invitation.findPendingByTenantAndEmail.mockResolvedValue(
        makeInvitation(),
      );

      await expect(
        service.createInvitation(makeAuth(), 'david@gmail.com', Role.CREW),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_DUPLICATE });
    });

    it('rejects invitations from non-management roles', async () => {
      await expect(
        service.createInvitation(
          makeAuth({ role: Role.VIEWER }),
          'david@gmail.com',
          Role.CREW,
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });

  describe('revokeInvitation (Phase 10 — authorization)', () => {
    it('revokes a pending invitation scoped to the active organization', async () => {
      repos.invitation.findById.mockResolvedValue(makeInvitation());

      await service.revokeInvitation(makeAuth(), 'inv-1');

      expect(repos.invitation.findById).toHaveBeenCalledWith(
        'inv-1',
        'tenant-buildright',
      );
      expect(repos.invitation.revoke).toHaveBeenCalledWith('inv-1');
    });

    it('rejects revoking an invitation from another organization (404)', async () => {
      repos.invitation.findById.mockResolvedValue(null);

      await expect(
        service.revokeInvitation(makeAuth(), 'inv-megabuild'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_NOT_FOUND });
    });

    it('rejects revoking an already-accepted invitation', async () => {
      repos.invitation.findById.mockResolvedValue(
        makeInvitation({ status: InvitationStatus.ACCEPTED }),
      );

      await expect(
        service.revokeInvitation(makeAuth(), 'inv-1'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_NOT_FOUND });
    });
  });

  describe('resolveInvitation', () => {
    it('returns sanitized invitation info for a pending, unexpired token', async () => {
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.tenant.findById.mockResolvedValue(makeTenant());
      repos.user.findByEmail.mockResolvedValue(null);

      const info = await service.resolveInvitation('a'.repeat(64));

      expect(info).toMatchObject({
        email: 'david@gmail.com',
        role: Role.SITE_ENGINEER,
        organizationName: 'BuildRight Construction',
        hasAccount: false,
      });
      expect(info.organizationId).toBe('tenant-buildright');
    });

    it('rejects an invalid/tampered token', async () => {
      repos.invitation.findByToken.mockResolvedValue(null);

      await expect(
        service.resolveInvitation('tampered-token'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_NOT_FOUND });
    });

    it('rejects an expired invitation (Phase 14 #17)', async () => {
      repos.invitation.findByToken.mockResolvedValue(
        makeInvitation({
          expiresAt: new Date(Date.now() - 60 * 1000),
        }),
      );

      await expect(
        service.resolveInvitation('a'.repeat(64)),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_EXPIRED });
    });

    it('rejects a revoked invitation', async () => {
      repos.invitation.findByToken.mockResolvedValue(
        makeInvitation({ status: InvitationStatus.REVOKED }),
      );

      await expect(
        service.resolveInvitation('a'.repeat(64)),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_REVOKED });
    });
  });

  describe('acceptInvitation (Phase 9 — CASE A new user / CASE B existing user)', () => {
    it('CASE A — creates a new account + membership when the invitee has no account', async () => {
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.user.findByEmail.mockResolvedValue(null);
      repos.user.create.mockResolvedValue(makeUser());
      repos.membership.findByUserAndTenant.mockResolvedValue(null);
      repos.membership.create.mockResolvedValue(makeMembership());

      const result = await service.acceptInvitation(
        'a'.repeat(64),
        null,
        { name: 'David Smith', password: 'Password1' },
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(repos.user.create).toHaveBeenCalledOnce();
      expect(repos.membership.create).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-buildright',
        role: Role.SITE_ENGINEER,
      });
      expect(repos.invitation.incrementUsedCount).toHaveBeenCalledWith('inv-1');
      expect(result.membershipCreated).toBe(true);
      expect(result.user?.tenantId).toBe('tenant-buildright');
    });

    it('single-use invitation — marks accepted and revokes pending on final use', async () => {
      repos.invitation.findByToken.mockResolvedValue(
        makeInvitation({ usageLimit: 1, usedCount: 0 }),
      );
      repos.user.findByEmail.mockResolvedValue(null);
      repos.user.create.mockResolvedValue(makeUser());
      repos.membership.findByUserAndTenant.mockResolvedValue(null);
      repos.membership.create.mockResolvedValue(makeMembership());

      const result = await service.acceptInvitation(
        'a'.repeat(64),
        null,
        { name: 'David Smith', password: 'Password1' },
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(repos.invitation.markAccepted).toHaveBeenCalledWith('inv-1', 'user-1');
      expect(repos.invitation.revokePendingForEmail).toHaveBeenCalledWith(
        'tenant-buildright',
        'david@gmail.com',
      );
      expect(result.membershipCreated).toBe(true);
    });

    it('CASE B — existing user accepts with an authenticated session', async () => {
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.user.findByEmail.mockResolvedValue(
        makeUser({ id: 'user-david', email: 'david@gmail.com', name: 'David' }),
      );
      repos.membership.findByUserAndTenant.mockResolvedValue(null);
      repos.membership.create.mockResolvedValue(
        makeMembership({ userId: 'user-david' }),
      );

      const result = await service.acceptInvitation(
        'a'.repeat(64),
        { userId: 'user-david', tenantId: 'tenant-other', role: Role.VIEWER },
        {},
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(repos.user.create).not.toHaveBeenCalled();
      expect(repos.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-david' }),
      );
      expect(result.membershipCreated).toBe(true);
    });

    it('requires authentication when the invited email already has an account', async () => {
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.user.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.acceptInvitation(
          'a'.repeat(64),
          null,
          {},
          { userAgent: 'vitest', ipAddress: '127.0.0.1' },
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_LOGIN_REQUIRED });
    });

    it('rejects accepting an invitation for a different account', async () => {
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.user.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.acceptInvitation(
          'a'.repeat(64),
          { userId: 'user-stranger', tenantId: 'tenant-other', role: Role.VIEWER },
          {},
          { userAgent: 'vitest', ipAddress: '127.0.0.1' },
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_LOGIN_REQUIRED });
    });

    it('does not create a duplicate membership (Phase 14 #15)', async () => {
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.user.findByEmail.mockResolvedValue(
        makeUser({ id: 'user-david', email: 'david@gmail.com' }),
      );
      repos.membership.findByUserAndTenant.mockResolvedValue(
        makeMembership({ userId: 'user-david', tenantId: 'tenant-buildright' }),
      );

      const result = await service.acceptInvitation(
        'a'.repeat(64),
        { userId: 'user-david', tenantId: 'tenant-other', role: Role.VIEWER },
        {},
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(repos.membership.create).not.toHaveBeenCalled();
      expect(result.membershipCreated).toBe(false);
    });

    it('rejects weak passwords on the new-account path', async () => {
      passwordService.validateStrength.mockReturnValue({
        valid: false,
        errors: ['password too weak'],
      });
      repos.invitation.findByToken.mockResolvedValue(makeInvitation());
      repos.user.findByEmail.mockResolvedValue(null);

      await expect(
        service.acceptInvitation(
          'a'.repeat(64),
          null,
          { name: 'David', password: 'weak' },
          { userAgent: 'vitest', ipAddress: '127.0.0.1' },
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.AUTH_WEAK_PASSWORD });
    });

    it('rejects expired invitations on accept (Phase 14 #17)', async () => {
      repos.invitation.findByToken.mockResolvedValue(
        makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.acceptInvitation(
          'a'.repeat(64),
          null,
          {},
          { userAgent: 'vitest', ipAddress: '127.0.0.1' },
        ),
      ).rejects.toMatchObject({ errorCode: ErrorCode.INVITATION_EXPIRED });
    });
  });

  describe('security invariants (Phase 12)', () => {
    it('never trusts a client-supplied organizationId for membership derivation', async () => {
      // A viewer cannot invoke any management operation, regardless of what
      // organizationId the client claims in its token/body.
      repos.membership.findByUserId.mockResolvedValue([]);

      const ctx = await service.getContext(
        makeAuth({ role: Role.VIEWER, tenantId: 'tenant-megabuild' }),
      );
      expect(ctx.organization).toBeNull();

      await expect(
        service.listMembers(makeAuth({ role: Role.VIEWER })),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });
});
