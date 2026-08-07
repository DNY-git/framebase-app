/**
 * Authenticated user attached to the request by the JwtAuthGuard.
 * Extends AuthContext with session tracking for revocation.
 */
import type { AuthContext } from '../authorization/authorization.types';

export interface AuthenticatedUser extends AuthContext {
  /** Session id for refresh-token revocation. Empty when not available. */
  sessionId: string;
}
