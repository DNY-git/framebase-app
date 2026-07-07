/**
 * Roles guard — enforces tenant-level role authorization on routes.
 *
 * Registered as a global APP_GUARD immediately AFTER JwtAuthGuard so it
 * runs only for authenticated requests. Reads the @Roles() metadata via
 * Reflector and compares the user's role against the allowed set.
 *
 * Behavior:
 *  - No @Roles() decorator present → allow (default: any authenticated user).
 *  - @Roles() present and user's role is in the list → allow.
 *  - @Roles() present and user's role is NOT in the list → 403 Forbidden.
 *  - @Public() routes are already allowed by JwtAuthGuard before this runs.
 *
 * See docs/security/authorization.md and PROJECT_RULES.md §8 (Security Rules).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@constructtrack/types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../decorators/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the allowed roles from the handler first, then the class.
    // getAllAndOverride merges them with handler taking precedence.
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator → default to "any authenticated user".
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const userRole = request.user?.role;

    if (!userRole) {
      // Should not happen (JwtAuthGuard runs first), but fail closed.
      throw new ForbiddenException('No role found on the authenticated user.');
    }

    if (!requiredRoles.includes(userRole as Role)) {
      throw new ForbiddenException(
        `This action requires one of: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
