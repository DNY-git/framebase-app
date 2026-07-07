/**
 * Authenticated user attached to the request by the JwtAuthGuard.
 * `tenantId` is the active tenant from the access token payload.
 * `sessionId` references the server-side session for revocation.
 */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
  sessionId: string;
}
