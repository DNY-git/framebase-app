/**
 * Authorization service — the reusable authorization layer.
 *
 * Centralizes project-access decisions so feature modules (Projects, Tasks,
 * Equipment, Inventory, Reports) call this instead of querying membership
 * repositories directly. This keeps authorization rules in one auditable
 * place and prevents drift across modules (PROJECT_RULES.md §28, §46).
 *
 * The service evaluates the three axes from docs/security/authorization.md:
 *   1. Tenant  — does the caller's tenantId match? (cross-tenant → deny)
 *   2. Role    — tenant admin bypasses project membership.
 *   3. Membership — is the caller a member of the project, with what role?
 *
 * "assert*" methods throw (ForbiddenException / NotFoundException);
 * "can*" methods return a boolean / AccessDecision for callers that need
 * to branch without throwing.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMemberRepository } from '../../modules/projects/repositories/project-member.repository';
import type {
  AuthContext,
  AccessDecision,
} from './authorization.types';
import {
  isTenantAdmin,
  canManageProject,
} from './permissions';
import type { ProjectRole, TenantId } from '@constructtrack/types';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly memberRepository: ProjectMemberRepository,
  ) {}

  /**
   * Decides whether the caller may access a project, and with what role.
   * Never throws — returns an AccessDecision for the caller to act on.
   *
   * Tenant admins always pass (projectRole null, isAdmin true).
   * Non-admins must have a project membership in the same tenant.
   */
  async resolveProjectAccess(
    auth: AuthContext,
    tenantId: TenantId,
    projectId: string,
  ): Promise<AccessDecision> {
    // Axis 1: tenant. If the caller's tenant doesn't match, deny.
    if (auth.tenantId !== tenantId) {
      return { allowed: false, projectRole: null, isAdmin: false };
    }

    // Axis 2: tenant admin bypasses project membership.
    if (isTenantAdmin(auth.role)) {
      return { allowed: true, projectRole: null, isAdmin: true };
    }

    // Axis 3: project membership.
    const membership = await this.memberRepository.findByProjectAndUser(
      tenantId,
      projectId,
      auth.userId,
    );

    if (!membership) {
      return { allowed: false, projectRole: null, isAdmin: false };
    }

    return {
      allowed: true,
      projectRole: membership.role,
      isAdmin: false,
    };
  }

  /**
   * Asserts the caller may access (view) the project.
   * Throws NotFoundException for non-members and cross-tenant callers —
   * existence is hidden per docs/security/authorization.md → Tenant Isolation.
   */
  async assertProjectAccess(
    auth: AuthContext,
    tenantId: TenantId,
    projectId: string,
  ): Promise<AccessDecision> {
    const decision = await this.resolveProjectAccess(
      auth,
      tenantId,
      projectId,
    );
    if (!decision.allowed) {
      // 404 (not 403) to avoid leaking project existence.
      throw new NotFoundException('Project not found.');
    }
    return decision;
  }

  /**
   * Asserts the caller may MANAGE the project (edit fields, manage members,
   * archive). Tenant admins always pass; otherwise the project role must be
   * manager or admin.
   */
  async assertProjectManager(
    auth: AuthContext,
    tenantId: TenantId,
    projectId: string,
  ): Promise<AccessDecision> {
    const decision = await this.assertProjectAccess(
      auth,
      tenantId,
      projectId,
    );
    if (decision.isAdmin) {
      return decision;
    }
    if (!canManageProject(decision.projectRole)) {
      throw new ForbiddenException(
        'You do not have permission to manage this project.',
      );
    }
    return decision;
  }

  /**
   * Boolean variant of assertProjectAccess — for callers that need to branch.
   */
  async canAccessProject(
    auth: AuthContext,
    tenantId: TenantId,
    projectId: string,
  ): Promise<boolean> {
    const decision = await this.resolveProjectAccess(
      auth,
      tenantId,
      projectId,
    );
    return decision.allowed;
  }

  /**
   * Boolean variant of assertProjectManager.
   */
  async canManageProject(
    auth: AuthContext,
    tenantId: TenantId,
    projectId: string,
  ): Promise<boolean> {
    const decision = await this.resolveProjectAccess(
      auth,
      tenantId,
      projectId,
    );
    if (!decision.allowed) return false;
    if (decision.isAdmin) return true;
    return canManageProject(decision.projectRole);
  }

  /**
   * Returns the ids of projects a user may access in a tenant — used by the
   * list endpoint to filter non-admins to their membership.
   */
  async accessibleProjectIds(
    tenantId: TenantId,
    userId: string,
  ): Promise<string[] | null> {
    const memberships = await this.memberRepository.findByUser(
      tenantId,
      userId,
    );
    // null means "no filter" (admin sees all); empty array means "sees none".
    return memberships.length > 0
      ? memberships.map((m) => m.projectId)
      : [];
  }
}
