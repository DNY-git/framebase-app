/**
 * Permissions — static role/permission constants and helpers.
 *
 * Defines which tenant-level roles are "admins" (bypass project membership)
 * and which project-level roles may manage a project. Kept here as pure
 * data so the authorization service and tests share one source of truth.
 *
 * See docs/security/authorization.md → Roles and → Project-Level Roles.
 */
import { Role, ProjectRole } from '@constructtrack/types';

/**
 * Tenant-level roles that grant administrative access — they bypass
 * project-membership checks and see all projects in their tenant.
 */
export const TENANT_ADMIN_ROLES: ReadonlySet<Role> = new Set([Role.ADMIN]);

/**
 * Project-level roles that may manage a project: edit fields, manage
 * members, change status, archive. Admins always qualify regardless of
 * their project role.
 */
export const PROJECT_MANAGER_ROLES: ReadonlySet<ProjectRole> = new Set([
  ProjectRole.MANAGER,
  ProjectRole.ADMIN,
]);

/**
 * Project-level roles that may edit project content (but not necessarily
 * manage members). Engineers can update fields; viewers/crew cannot.
 */
export const PROJECT_EDITOR_ROLES: ReadonlySet<ProjectRole> = new Set([
  ProjectRole.ENGINEER,
  ProjectRole.MANAGER,
  ProjectRole.ADMIN,
]);

/**
 * Returns true if the tenant-level role grants admin (bypass) access.
 */
export function isTenantAdmin(role: Role): boolean {
  return TENANT_ADMIN_ROLES.has(role);
}

/**
 * Returns true if the project-level role may manage a project.
 */
export function canManageProject(role: ProjectRole | null): boolean {
  return role !== null && PROJECT_MANAGER_ROLES.has(role);
}

/**
 * Returns true if the project-level role may edit project content.
 */
export function canEditProject(role: ProjectRole | null): boolean {
  return role !== null && PROJECT_EDITOR_ROLES.has(role);
}
