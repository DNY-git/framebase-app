/**
 * Param decorators for extracting the authenticated user / tenant from
 * the request. These avoid magic strings and keep controllers readable.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   @Get('projects')
 *   list(@CurrentTenant() tenantId: string) { ... }
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';

/**
 * Extracts the full authenticated user object (or a single property).
 *   @CurrentUser()           → AuthenticatedUser
 *   @CurrentUser('userId')   → string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);

/**
 * Extracts the active tenantId from the authenticated user.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    return request.user?.tenantId;
  },
);
