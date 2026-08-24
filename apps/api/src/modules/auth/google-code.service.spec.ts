/**
 * Unit tests for GoogleCodeService — the one-time code handoff between the
 * OAuth callback and the SPA exchange endpoint.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Role } from '@constructtrack/types';
import { GoogleCodeService } from './google-code.service';

describe('GoogleCodeService', () => {
  let service: GoogleCodeService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new GoogleCodeService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('issues a unique code for a principal', () => {
    const a = service.issue('u1', 't1', Role.OWNER);
    const b = service.issue('u1', 't1', Role.OWNER);
    expect(a).not.toBe(b);
  });

  it('consumes a code exactly once (single use)', () => {
    const code = service.issue('u1', 't1', Role.ADMIN);
    expect(service.consume(code)).toEqual({ userId: 'u1', tenantId: 't1', role: Role.ADMIN });
    expect(service.consume(code)).toBeNull();
  });

  it('returns null for unknown codes', () => {
    expect(service.consume('nope')).toBeNull();
  });

  it('rejects codes after their 60s TTL', () => {
    const code = service.issue('u1', 't1', Role.OWNER);
    vi.advanceTimersByTime(61_000);
    expect(service.consume(code)).toBeNull();
  });

  it('keeps codes valid before the TTL elapses', () => {
    const code = service.issue('u1', 't1', Role.OWNER);
    vi.advanceTimersByTime(59_000);
    expect(service.consume(code)).not.toBeNull();
  });
});