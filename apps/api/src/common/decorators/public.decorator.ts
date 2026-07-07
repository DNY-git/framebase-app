/**
 * @Public() decorator — marks a route or controller as exempt from the
 * global JWT auth guard. Use sparingly and with justification, per
 * PROJECT_RULES.md §45 ("Authentication is required by default").
 *
 * Example:
 *   @Public()
 *   @Post('login')
 *   login() { ... }
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
