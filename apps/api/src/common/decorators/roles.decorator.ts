/**
 * @Roles() decorator — declares which tenant-level roles may access a route.
 *
 * Reads the Role enum from @constructtrack/types. The RolesGuard (registered
 * as a global APP_GUARD after JwtAuthGuard) enforces it. When no @Roles()
 * decorator is present on a handler/class, any authenticated user may pass —
 * the default is "authenticated access" (PROJECT_RULES.md §45).
 *
 * Example:
 *   @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
 *   @Post()
 *   create() { ... }
 *
 * Supported roles: ADMIN, PROJECT_MANAGER, SITE_ENGINEER, CREW,
 * PROCUREMENT, FLEET_MANAGER, VIEWER.
 */
import { SetMetadata } from '@nestjs/common';
import { Role } from '@constructtrack/types';

export const ROLES_KEY = 'roles';

/**
 * Marks a route (or controller) as accessible only to the listed roles.
 * Multiple roles are OR-combined — the user needs at least one.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
