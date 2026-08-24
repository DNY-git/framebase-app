/**
 * GoogleCodeService — one-time sign-in codes for the Google OAuth handoff.
 *
 * The OAuth callback runs in the API origin (http://localhost:4000), but the
 * SPA lives on a different origin (http://localhost:5173). Handing tokens
 * through the redirect URL would leak them into history/referrers, so the
 * callback mints a short-lived single-use code and the SPA exchanges it for
 * a token pair via POST /auth/google/exchange.
 *
 * Codes are stored in memory, expire after 60s, and are deleted on first use.
 */
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Role } from '@constructtrack/types';

export interface GoogleCodePayload {
  userId: string;
  tenantId: string;
  role: Role;
}

const CODE_TTL_MS = 60_000;
const MAX_CODES = 10_000;

@Injectable()
export class GoogleCodeService {
  private readonly codes = new Map<string, { payload: GoogleCodePayload; expiresAt: number }>();

  issue(userId: string, tenantId: string, role: Role): string {
    this.prune();
    const code = randomBytes(24).toString('base64url');
    this.codes.set(code, {
      payload: { userId, tenantId, role },
      expiresAt: Date.now() + CODE_TTL_MS,
    });
    return code;
  }

  /** Single-use: the code is removed regardless of validity. */
  consume(code: string): GoogleCodePayload | null {
    const entry = this.codes.get(code);
    this.codes.delete(code);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.payload;
  }

  private prune(): void {
    if (this.codes.size < MAX_CODES) return;
    const now = Date.now();
    for (const [code, entry] of this.codes) {
      if (now > entry.expiresAt) this.codes.delete(code);
    }
  }
}