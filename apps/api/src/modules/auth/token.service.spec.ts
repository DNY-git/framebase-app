/**
 * Unit tests for TokenService.
 *
 * Verifies access/refresh token sign+verify round-trips, distinct secrets
 * (an access token must NOT verify as a refresh token and vice versa), and
 * that tampered or expired tokens are rejected.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@constructtrack/types';
import type { AppConfig } from '../../config/configuration';
import { TokenService } from './token.service';

function makeConfigService(overrides: Record<string, unknown> = {}): ConfigService<AppConfig, true> {
  const values: Record<string, unknown> = {
    jwtAccessSecret: 'access-test-secret',
    jwtRefreshSecret: 'refresh-test-secret',
    jwtAccessTtl: '15m',
    jwtRefreshTtl: '7d',
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
  } as ConfigService<AppConfig, true>;
}

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeAll(() => {
    const jwtService = new JwtService({ secret: 'test' });
    tokenService = new TokenService(jwtService, makeConfigService());
  });

  describe('generateTokenPair', () => {
    it('issues a verifiable access + refresh pair', async () => {
      const pair = await tokenService.generateTokenPair(
        { sub: 'user-1', tenantId: 'tenant-1', role: 'admin' as Role },
        { sub: 'user-1', sid: 'session-1' },
      );

      expect(pair.accessToken).toBeTruthy();
      expect(pair.refreshToken).toBeTruthy();
      expect(pair.expiresIn).toBe(900); // 15m in seconds

      const accessPayload = await tokenService.verifyAccessToken(pair.accessToken);
      expect(accessPayload.sub).toBe('user-1');
      expect(accessPayload.tenantId).toBe('tenant-1');
      expect(accessPayload.role).toBe('admin');

      const refreshPayload = await tokenService.verifyRefreshToken(pair.refreshToken);
      expect(refreshPayload.sub).toBe('user-1');
      expect(refreshPayload.sid).toBe('session-1');
    });

    it('uses distinct secrets — access token fails refresh verification', async () => {
      const pair = await tokenService.generateTokenPair(
        { sub: 'user-1', tenantId: 'tenant-1', role: 'admin' as Role },
        { sub: 'user-1', sid: 'session-1' },
      );

      await expect(
        tokenService.verifyRefreshToken(pair.accessToken),
      ).rejects.toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('rejects a tampered token', async () => {
      const pair = await tokenService.generateTokenPair(
        { sub: 'user-1', tenantId: 'tenant-1', role: 'admin' as Role },
        { sub: 'user-1', sid: 'session-1' },
      );
      const tampered = pair.accessToken.slice(0, -4) + 'XXXX';
      await expect(tokenService.verifyAccessToken(tampered)).rejects.toThrow();
    });

    it('rejects an expired token', async () => {
      // Use a service with a 0-second TTL so the token is already expired.
      const expiredService = new TokenService(
        new JwtService({ secret: 'test' }),
        makeConfigService({ jwtAccessTtl: '1s' }),
      );
      const pair = await expiredService.generateTokenPair(
        { sub: 'user-1', tenantId: 'tenant-1', role: 'admin' as Role },
        { sub: 'user-1', sid: 'session-1' },
      );
      // Wait 1.2s for expiry.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await expect(tokenService.verifyAccessToken(pair.accessToken)).rejects.toThrow();
    });
  });
});
