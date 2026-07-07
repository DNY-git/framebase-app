/**
 * Barrel re-export for auth-related decorators.
 *
 * Controllers import { CurrentUser, CurrentTenant } from this file
 * instead of referencing the individual decorator files.
 */
export { CurrentUser, CurrentTenant } from './current-user.decorator';
