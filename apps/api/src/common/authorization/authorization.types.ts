/**
 * Authorization types — shared shapes for the authorization layer.
 *
 * These types keep the authorization service generic so future modules
 * (Tasks, Equipment, Inventory, Reports) can reuse it without depending on
 * Project-specific types. The caller passes an AuthContext (from the JWT
 * guard) and a ResourceContext (project-scoped); the service decides.
 *
 * See docs/security/authorization.md → Three Axes of Access.
 */
import type { Role, ProjectRole, TenantId, UserId } from '@constructtrack/types';

/**
 * The authenticated caller, as attached to the request by JwtAuthGuard.
 * Mirrors AuthenticatedUser but lives in the authorization layer's vocabulary.
 */
export interface AuthContext {
  userId: UserId;
  tenantId: TenantId;
  /** Tenant-level role from the JWT payload. */
  role: Role;
}

/**
 * The resource being accessed — currently always project-scoped. Future
 * resource types (equipment, inventory) can extend this union.
 */
export interface ProjectResourceContext {
  kind: 'project';
  projectId: string;
}

export type ResourceContext = ProjectResourceContext;

/**
 * The result of an access check: allowed + the matched project role (if any).
 * Project role is null for admins who bypass project-level checks.
 */
export interface AccessDecision {
  allowed: boolean;
  /** The user's project-scoped role, if they are a member. */
  projectRole: ProjectRole | null;
  /** True when the user is a tenant admin (bypasses project membership). */
  isAdmin: boolean;
}
