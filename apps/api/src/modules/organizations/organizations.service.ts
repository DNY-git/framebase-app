/**
 * Organizations service — organization context, team management,
 * invitations, and the secure active-organization mechanism.
 *
 * Organizations are the existing Tenant model (see prompt audit). The
 * server derives organization context from authenticated identity +
 * membership docs — the client can never assert an organizationId.
 *
 * Management operations (members, invitations) require OWNER or ADMIN.
 * Guarding is enforced both at the route layer (@Roles) and here.
 *
 * See prompt2.txt phases 3-10 and docs/security/authorization.md.
 */
import {
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ErrorCode, Role, TenantId } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { isTenantAdmin } from '../../common/authorization/permissions';
import type { AuthContext } from '../../common/authorization/authorization.types';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import type { AuthResult } from '../auth/auth.service';
import { TenantRepository } from '../auth/repositories/tenant.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { MembershipRepository } from '../auth/repositories/membership.repository';
import { SessionRepository } from '../auth/repositories/session.repository';
import { InvitationRepository, InvitationDomain } from './repositories/invitation.repository';
import { INVITABLE_ROLES } from './dto/create-invitation.dto';
import type { AppConfig } from '../../config/configuration';

/** Client metadata captured for session tracking (mirrors auth module). */
export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
}

/** Roles that protect an organization from losing all leadership. */
const LEADERSHIP_ROLES: readonly Role[] = [Role.OWNER, Role.ADMIN];

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly tenantRepository: TenantRepository,
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  // -------------------------------------------------------------------------
  // Context & multi-organization support
  // -------------------------------------------------------------------------

  /**
   * Returns the caller's active organization context + every organization
   * they belong to (for the organization switcher).
   */
  async getContext(auth: AuthContext): Promise<{
    organization: {
      id: string;
      name: string;
      slug: string;
      role: Role;
    } | null;
    memberships: Array<{ id: string; name: string; slug: string; role: Role }>;
  }> {
    const memberships = await this.membershipRepository.findByUserId(auth.userId);
    const tenants = await this.tenantRepository.findByIds(
      memberships.map((m) => m.tenantId),
    );
    const tenantById = new Map(tenants.map((t) => [t.id, t]));

    const current = memberships.find((m) => m.tenantId === auth.tenantId);

    return {
      organization: current
        ? {
            id: current.tenantId,
            name: tenantById.get(current.tenantId)?.name ?? 'Unknown organization',
            slug: tenantById.get(current.tenantId)?.slug ?? '',
            role: current.role,
          }
        : null,
      memberships: memberships
        .map((m) => ({
          id: m.tenantId,
          name: tenantById.get(m.tenantId)?.name ?? 'Unknown organization',
          slug: tenantById.get(m.tenantId)?.slug ?? '',
          role: m.role,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Creates a new organization: the caller becomes its OWNER and is
   * immediately switched into it (fresh token pair).
   */
  async createOrganization(
    auth: AuthContext,
    name: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const slug = this.slugify(name);
    let tenant;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        tenant = await this.tenantRepository.create({ name, slug });
        break;
      } catch {
        if (attempt === 4) throw new DomainException(
          ErrorCode.ORG_NAME_TAKEN,
          HttpStatus.CONFLICT,
          'Could not create organization — the name is already in use.',
        );
      }
    }
    if (!tenant) {
      throw new DomainException(ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to create organization.');
    }

    await this.membershipRepository.create({
      userId: auth.userId,
      tenantId: tenant.id,
      role: Role.OWNER,
    });

    const result = await this.issueTokens(auth.userId, tenant.id, Role.OWNER, meta);
    const user = await this.userRepository.findById(auth.userId);

    await this.auditService.record({
      tenantId: tenant.id,
      actorId: auth.userId,
      action: 'organization.created',
      entityType: 'Tenant',
      entityId: tenant.id,
      after: { name, ownerId: auth.userId },
      correlationId: meta.correlationId,
    });

    return {
      ...result,
      user: {
        id: auth.userId,
        email: user?.email ?? '',
        name: user?.name ?? '',
        role: Role.OWNER,
        tenantId: tenant.id,
        avatarUrl: user?.avatarUrl ?? null,
      },
    };
  }

  /**
   * Switches the caller to one of their organizations.
   *
   * Security: the server verifies the target membership before re-issuing
   * tokens. A client cannot switch to an organization where the user has
   * no membership (prompt Phase 4).
   */
  async switchOrganization(
    auth: AuthContext,
    tenantId: TenantId,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const membership = await this.membershipRepository.findByUserAndTenant(
      auth.userId,
      tenantId,
    );
    if (!membership) {
      throw new DomainException(
        ErrorCode.ORG_MEMBERSHIP_REQUIRED,
        HttpStatus.FORBIDDEN,
        'You are not a member of this organization.',
      );
    }
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new DomainException(ErrorCode.ORG_NOT_FOUND, HttpStatus.NOT_FOUND, 'Organization not found.');
    }
    const user = await this.userRepository.findById(auth.userId);
    if (!user) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }

    const result = await this.issueTokens(user.id, tenant.id, membership.role, meta);

    await this.auditService.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'organization.switched',
      entityType: 'Tenant',
      entityId: tenant.id,
      correlationId: meta.correlationId,
    });

    return {
      ...result,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        tenantId: tenant.id,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Team / members
  // -------------------------------------------------------------------------

  /**
   * Lists the current organization's members with hydrated user details.
   * Management callers only (route-level @Roles(OWNER, ADMIN) + service check).
   */
  async listMembers(auth: AuthContext): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl: string | null;
    joinedAt: Date;
  }>> {
    this.assertManagement(auth, 'list members');
    return this.listDirectoryUnchecked(auth);
  }

  /**
   * Read-only member directory for project assignment.
   *
   * Available to PROJECT_MANAGER and above so project managers can add
   * organization members to projects (prompt Phase 6). Non-management
   * mutations remain OWNER/ADMIN-only; this endpoint never reveals
   * sensitive data and cannot mutate anything.
   */
  async listDirectory(auth: AuthContext): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl: string | null;
    joinedAt: Date;
  }>> {
    if (
      !this.canViewDirectory(auth.role)
    ) {
      throw new DomainException(
        ErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        'You do not have permission to view the member directory.',
      );
    }
    return this.listDirectoryUnchecked(auth);
  }

  private async listDirectoryUnchecked(auth: AuthContext): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl: string | null;
    joinedAt: Date;
  }>> {
    const memberships = await this.membershipRepository.findByTenant(auth.tenantId);
    const users = await this.userRepository.findByIds(
      memberships.map((m) => m.userId),
    );
    const userById = new Map(users.map((u) => [u.id, u]));

    return memberships
      .map((m) => ({
        id: m.userId,
        name: userById.get(m.userId)?.name ?? 'Unknown',
        email: userById.get(m.userId)?.email ?? '',
        role: m.role,
        avatarUrl: userById.get(m.userId)?.avatarUrl ?? null,
        joinedAt: m.createdAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Directory access: OWNER, ADMIN, PROJECT_MANAGER (project assignment). */
  private canViewDirectory(role: Role): boolean {
    return (
      role === Role.OWNER ||
      role === Role.ADMIN ||
      role === Role.PROJECT_MANAGER
    );
  }

  /**
   * Changes a member's organization role. OWNER/ADMIN only.
   *  - The caller cannot change their own role.
   *  - Only an OWNER can grant the OWNER role.
   *  - The last OWNER/ADMIN cannot be demoted.
   */
  async updateMemberRole(
    auth: AuthContext,
    targetUserId: string,
    role: Role,
  ): Promise<{ id: string; role: Role }> {
    this.assertManagement(auth, 'update member roles');

    if (targetUserId === auth.userId) {
      throw new DomainException(ErrorCode.MEMBER_SELF_ROLE_CHANGE, HttpStatus.BAD_REQUEST, 'You cannot change your own role.');
    }
    if (role === Role.OWNER && auth.role !== Role.OWNER) {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Only an organization OWNER can grant the OWNER role.');
    }

    const membership = await this.membershipRepository.findByUserAndTenant(
      targetUserId,
      auth.tenantId,
    );
    if (!membership) {
      throw new DomainException(ErrorCode.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Member not found in this organization.');
    }
    if (membership.role === role) {
      return { id: membership.id, role: membership.role };
    }

    await this.assertLeadershipIntact(auth.tenantId, membership.role, role);

    const updated = await this.membershipRepository.updateRole(
      targetUserId,
      auth.tenantId,
      role,
    );
    if (!updated) {
      throw new DomainException(ErrorCode.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Member not found in this organization.');
    }

    await this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'organization.member_role_updated',
      entityType: 'Membership',
      entityId: updated.id,
      before: { userId: targetUserId, role: membership.role },
      after: { userId: targetUserId, role },
      correlationId: '',
    });

    return { id: updated.id, role: updated.role };
  }

  /**
   * Removes a member from the organization. OWNER/ADMIN only.
   *  - The caller cannot remove themselves (leaving is a separate flow).
   *  - The last OWNER/ADMIN cannot be removed.
   */
  async removeMember(auth: AuthContext, targetUserId: string): Promise<void> {
    this.assertManagement(auth, 'remove members');

    if (targetUserId === auth.userId) {
      throw new DomainException(ErrorCode.MEMBER_SELF_REMOVE, HttpStatus.BAD_REQUEST, 'You cannot remove yourself. Use the leave-organization flow instead.');
    }

    const membership = await this.membershipRepository.findByUserAndTenant(
      targetUserId,
      auth.tenantId,
    );
    if (!membership) {
      throw new DomainException(ErrorCode.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Member not found in this organization.');
    }

    await this.assertLeadershipIntact(auth.tenantId, membership.role, null);

    const removed = await this.membershipRepository.delete(targetUserId, auth.tenantId);
    if (!removed) {
      throw new DomainException(ErrorCode.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Member not found in this organization.');
    }

    await this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'organization.member_removed',
      entityType: 'Membership',
      entityId: membership.id,
      before: { userId: targetUserId, role: membership.role },
      correlationId: '',
    });
  }

  // -------------------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------------------

  /**
   * Creates an invitation for an email + role in the caller's organization.
   * The returned token is random and non-guessable; the dev acceptance link
   * is development-only (production email delivery is added later).
   */
  async createInvitation(
    auth: AuthContext,
    email: string,
    role: Role,
  ): Promise<{
    id: string;
    email: string;
    role: Role;
    status: string;
    expiresAt: Date;
    devAcceptUrl: string;
  }> {
    this.assertManagement(auth, 'invite members');

    if (!INVITABLE_ROLES.includes(role)) {
      throw new DomainException(
        ErrorCode.INVITATION_INVALID_ROLE,
        HttpStatus.BAD_REQUEST,
        'The OWNER role cannot be granted by invitation.',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const alreadyMember = await this.membershipRepository.exists(
        existingUser.id,
        auth.tenantId,
      );
      if (alreadyMember) {
        throw new DomainException(
          ErrorCode.INVITATION_ALREADY_MEMBER,
          HttpStatus.CONFLICT,
          'This user is already a member of the organization.',
        );
      }
    }

    const pending = await this.invitationRepository.findPendingByTenantAndEmail(
      auth.tenantId,
      normalizedEmail,
    );
    if (pending) {
      throw new DomainException(
        ErrorCode.INVITATION_DUPLICATE,
        HttpStatus.CONFLICT,
        'A pending invitation already exists for this email.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await this.invitationRepository.create({
      tenantId: auth.tenantId,
      email: normalizedEmail,
      role,
      token,
      expiresAt,
      invitedBy: auth.userId,
    });

    await this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'organization.invitation_created',
      entityType: 'Invitation',
      entityId: invitation.id,
      after: { email: normalizedEmail, role },
      correlationId: '',
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      devAcceptUrl: this.devAcceptUrl(token),
    };
  }

  /** Lists the organization's invitations (newest first). OWNER/ADMIN only. */
  async listInvitations(auth: AuthContext): Promise<Array<{
    id: string;
    email: string;
    role: Role;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    devAcceptUrl: string | null;
  }>> {
    this.assertManagement(auth, 'view invitations');
    const invitations = await this.invitationRepository.findByTenant(auth.tenantId);
    return invitations.map((i: InvitationDomain) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      devAcceptUrl: i.status === 'pending' ? this.devAcceptUrl(i.token) : null,
    }));
  }

  /** Revokes a pending invitation. OWNER/ADMIN only. */
  async revokeInvitation(auth: AuthContext, invitationId: string): Promise<void> {
    this.assertManagement(auth, 'revoke invitations');

    const invitation = await this.invitationRepository.findById(
      invitationId,
      auth.tenantId,
    );
    if (!invitation) {
      throw new DomainException(ErrorCode.INVITATION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Invitation not found.');
    }
    if (invitation.status !== 'pending') {
      throw new DomainException(ErrorCode.INVITATION_NOT_FOUND, HttpStatus.CONFLICT, 'Only pending invitations can be revoked.');
    }

    await this.invitationRepository.revoke(invitation.id);

    await this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'organization.invitation_revoked',
      entityType: 'Invitation',
      entityId: invitation.id,
      before: { email: invitation.email, role: invitation.role },
      correlationId: '',
    });
  }

  /**
   * Resolves an invitation by token for the (public) acceptance page.
   * Returns sanitized info; never reveals other invitations or tokens.
   */
  async resolveInvitation(token: string): Promise<{
    email: string;
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    status: string;
    expiresAt: Date;
    hasAccount: boolean;
  }> {
    const invitation = await this.findPendingOrThrow(token);

    const tenant = await this.tenantRepository.findById(invitation.tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new DomainException(ErrorCode.INVITATION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Invitation not found.');
    }

    const hasAccount = (await this.userRepository.findByEmail(invitation.email)) !== null;

    return {
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.tenantId,
      organizationName: tenant.name,
      organizationSlug: tenant.slug,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      hasAccount,
    };
  }

  /**
   * Accepts an invitation.
   *
   *  - Pending + unexpired only.
   *  - Existing user: the caller MUST be authenticated as that user
   *    (a bare link does not grant membership to a stranger's account).
   *  - New user: creates the account (name + password) and the membership.
   *
   * On success the response carries a fresh token pair already scoped to the
   * invited organization, so the client is immediately in the right context.
   * No duplicate membership is ever created (unique index — idempotent).
   */
  async acceptInvitation(
    token: string,
    auth: AuthContext | null,
    body: { name?: string; password?: string },
    meta: RequestMeta,
  ): Promise<AuthResult & { membershipCreated: boolean }> {
    const invitation = await this.findPendingOrThrow(token);

    const existingUser = await this.userRepository.findByEmail(invitation.email);

    let user: { id: string; email: string; name: string; avatarUrl: string | null };
    let membershipCreated = false;

    if (existingUser) {
      if (!auth) {
        throw new DomainException(
          ErrorCode.INVITATION_LOGIN_REQUIRED,
          HttpStatus.UNAUTHORIZED,
          'You already have a Framebase account. Log in to accept this invitation.',
        );
      }
      if (auth.userId !== existingUser.id) {
        throw new DomainException(
          ErrorCode.INVITATION_LOGIN_REQUIRED,
          HttpStatus.UNAUTHORIZED,
          'This invitation belongs to a different account. Log in with the invited email to accept it.',
        );
      }
      if (existingUser.status !== 'active') {
        throw new DomainException(ErrorCode.AUTH_DISABLED_ACCOUNT, HttpStatus.UNAUTHORIZED, 'Account is disabled.');
      }
      user = existingUser;
    } else {
      const name = body.name?.trim();
      const password = body.password;

      if (!name || !password) {
        throw new DomainException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'A name and password are required to create your account.');
      }
      const strength = this.passwordService.validateStrength(password);
      if (!strength.valid) {
        throw new DomainException(
          ErrorCode.AUTH_WEAK_PASSWORD,
          HttpStatus.CONFLICT,
          strength.errors.join(' '),
        );
      }

      const passwordHash = await this.passwordService.hash(password);
      let created;
      try {
        created = await this.userRepository.create({
          email: invitation.email,
          passwordHash,
          name,
        });
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
          throw new DomainException(ErrorCode.AUTH_DUPLICATE_EMAIL, HttpStatus.CONFLICT, 'A user with this email already exists.');
        }
        throw err;
      }
      user = created;
    }

    // Create the membership idempotently — the unique (userId, tenantId)
    // index makes duplicates structurally impossible.
    let membership = await this.membershipRepository.findByUserAndTenant(
      user.id,
      invitation.tenantId,
    );
    if (!membership) {
      membership = await this.membershipRepository.create({
        userId: user.id,
        tenantId: invitation.tenantId,
        role: invitation.role,
      });
      membershipCreated = true;
    }

    await this.invitationRepository.markAccepted(invitation.id, user.id);
    // Accepting one invitation invalidates the rest pending for that email.
    await this.invitationRepository.revokePendingForEmail(
      invitation.tenantId,
      invitation.email,
    );

    const result = await this.issueTokens(
      user.id,
      invitation.tenantId,
      membership.role,
      meta,
    );

    await this.auditService.record({
      tenantId: invitation.tenantId,
      actorId: user.id,
      action: 'organization.invitation_accepted',
      entityType: 'Invitation',
      entityId: invitation.id,
      after: { email: invitation.email, role: membership.role, membershipCreated },
      correlationId: meta.correlationId,
    });

    return {
      ...result,
      membershipCreated,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        tenantId: invitation.tenantId,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Loads a pending, unexpired invitation by token (404 on anything else). */
  private async findPendingOrThrow(token: string): Promise<InvitationDomain> {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      throw new DomainException(ErrorCode.INVITATION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Invitation not found.');
    }
    if (invitation.status === 'revoked') {
      throw new DomainException(ErrorCode.INVITATION_REVOKED, HttpStatus.CONFLICT, 'This invitation has been revoked.');
    }
    if (invitation.status === 'accepted') {
      throw new DomainException(ErrorCode.INVITATION_ALREADY_ACCEPTED, HttpStatus.CONFLICT, 'This invitation has already been accepted.');
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new DomainException(ErrorCode.INVITATION_EXPIRED, HttpStatus.GONE, 'This invitation has expired.');
    }
    return invitation;
  }

  /** Guards leadership positions when roles change or members are removed. */
  private async assertLeadershipIntact(
    tenantId: string,
    currentRole: Role | null,
    newRole: Role | null,
  ): Promise<void> {
    const isLeadershipRole = (r: Role | null): boolean =>
      r !== null && LEADERSHIP_ROLES.includes(r);

    // Only relevant when a leadership member is demoted or removed.
    if (!isLeadershipRole(currentRole)) return;
    if (newRole !== null && isLeadershipRole(newRole)) return;

    const count = await this.membershipRepository.countMembersWithRole(
      tenantId,
      [...LEADERSHIP_ROLES] as Role[],
    );
    if (count <= 1) {
      throw new DomainException(
        ErrorCode.MEMBER_LAST_OWNER,
        HttpStatus.BAD_REQUEST,
        'Cannot remove or demote the last owner/admin of an organization.',
      );
    }
  }

  /** Management actions require OWNER or ADMIN (belt-and-suspenders). */
  private assertManagement(auth: AuthContext, action: string): void {
    if (!isTenantAdmin(auth.role)) {
      throw new DomainException(
        ErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        `You do not have permission to ${action}.`,
      );
    }
  }

  /** Issues a session + token pair scoped to the given tenant context. */
  private async issueTokens(
    userId: string,
    tenantId: string,
    role: Role,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const refreshTtl = this.configService.get<string>('jwtRefreshTtl', {
      infer: true,
    });
    const ttlSeconds = this.ttlToSeconds(refreshTtl);

    const tokenPair = await this.tokenService.generateTokenPair(
      { sub: userId, tenantId, role },
      { sub: userId, sid: 'pending' },
    );

    await this.sessionRepository.createSession({
      userId,
      refreshToken: tokenPair.refreshToken,
      ttlSeconds,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: userId,
        email: '',
        name: '',
        role,
        tenantId,
        avatarUrl: null,
      },
    };
  }

  private devAcceptUrl(token: string): string {
    const appUrl = this.configService.get<string>('appUrl', { infer: true });
    return `${appUrl}/invitations/${token}`;
  }

  /** Converts an organization name to a URL-safe slug. */
  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org';
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }

  private ttlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 604800;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 604800;
    }
  }
}