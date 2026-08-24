/**
 * Unit tests for AuthService.
 *
 * Mocks the repositories and supporting services to verify business logic:
 *  - register creates tenant + user + admin membership, issues tokens, audits
 *  - login rejects wrong password with a generic 401 (no enumeration)
 *  - refresh rotates the session and rejects reused (revoked) tokens
 *
 * Integration with a real DB is covered in auth.e2e.spec.ts.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../common/exceptions/domain.exception';
import { Role } from '@constructtrack/types';
import type { AppConfig } from '../../config/configuration';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import type { PasswordStrengthResult } from './password.service';
import { TokenService } from './token.service';
import type { TokenPair, RefreshTokenPayload } from './token.service';

// --- Mocks -----------------------------------------------------------------

function mockPasswordService() {
  return {
    hash: vi.fn<() => Promise<string>>().mockResolvedValue('hashed-password'),
    compare: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    validateStrength: vi.fn<() => PasswordStrengthResult>().mockReturnValue({
      valid: true,
      errors: [],
    }),
  };
}

function mockTokenService() {
  return {
    generateTokenPair: vi
      .fn<() => Promise<TokenPair>>()
      .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn<() => Promise<RefreshTokenPayload>>(),
  };
}

function mockConfigService(): ConfigService<AppConfig, true> {
  return {
    get: <K extends keyof AppConfig>(key: K): AppConfig[K] =>
      (key === 'jwtRefreshTtl' ? '7d' : '') as AppConfig[K],
  } as ConfigService<AppConfig, true>;
}

function mockRepositories() {
  return {
    tenant: {
      create: vi.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Org',
        slug: 'org-abc',
        status: 'active',
      }),
    },
    user: {
      existsByEmail: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        status: 'active',
      }),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findByGoogleId: vi.fn(),
      linkGoogleId: vi.fn(),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
    },
    membership: {
      create: vi.fn().mockResolvedValue(undefined),
      findByUserId: vi.fn(),
      findByUserAndTenant: vi.fn(),
    },
    session: {
      createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
      findActiveByToken: vi.fn(),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      revokeSessionByToken: vi.fn().mockResolvedValue(true),
      revokeAllUserSessions: vi.fn().mockResolvedValue(0),
    },
    audit: { record: vi.fn().mockResolvedValue(undefined) },
  };
}

// --- Tests -----------------------------------------------------------------

describe('AuthService', () => {
  let passwordService: ReturnType<typeof mockPasswordService>;
  let tokenService: ReturnType<typeof mockTokenService>;
  let repos: ReturnType<typeof mockRepositories>;
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordService = mockPasswordService();
    tokenService = mockTokenService();
    repos = mockRepositories();
    service = new AuthService(
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
      repos.tenant as never,
      repos.user as never,
      repos.membership as never,
      repos.session as never,
      repos.audit as never,
      mockConfigService(),
    );
  });

  describe('register', () => {
    it('creates a tenant, user, owner membership, and issues tokens', async () => {
      const result = await service.register(
        { email: 'test@example.com', password: 'Password1', name: 'Test' },
        { userAgent: 'vitest', ipAddress: '127.0.0.1' },
      );

      expect(repos.tenant.create).toHaveBeenCalledOnce();
      expect(repos.user.create).toHaveBeenCalledOnce();
      expect(repos.membership.create).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: Role.OWNER,
      });
      expect(repos.audit.record).toHaveBeenCalledOnce();
      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
    });

    it('throws ConflictException when the email already exists (duplicate key)', async () => {
      const dupError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      repos.user.create.mockRejectedValue(dupError);
      await expect(
        service.register(
          { email: 'dup@example.com', password: 'Password1', name: 'Dup' },
          {},
        ),
      ).rejects.toThrow(DomainException);
    });

    it('re-throws non-duplicate-key errors from user.create', async () => {
      repos.user.create.mockRejectedValue(new Error('connection refused'));
      await expect(
        service.register(
          { email: 'fail@example.com', password: 'Password1', name: 'Fail' },
          {},
        ),
      ).rejects.toThrow('connection refused');
    });

    it('throws ConflictException on weak password (defense-in-depth)', async () => {
      passwordService.validateStrength.mockReturnValue({
        valid: false,
        errors: ['too short'],
      });
      await expect(
        service.register(
          { email: 'weak@example.com', password: 'weak', name: 'Weak' },
          {},
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('login', () => {
    it('issues tokens when credentials are valid', async () => {
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test',
        status: 'active',
      });
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN },
      ]);

      const result = await service.login(
        { email: 'test@example.com', password: 'Password1' },
        {},
      );

      expect(result.accessToken).toBe('at');
      expect(result.user.role).toBe(Role.ADMIN);
      expect(repos.user.updateLastLogin).toHaveBeenCalledWith('user-1');
      expect(repos.audit.record).toHaveBeenCalledOnce();
    });

    it('throws UnauthorizedException when the user is not found', async () => {
      repos.user.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@example.com', password: 'x' }, {}),
      ).rejects.toThrow(DomainException);
    });

    it('throws UnauthorizedException when the password is wrong (generic)', async () => {
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test',
        status: 'active',
      });
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }, {}),
      ).rejects.toThrow(DomainException);
    });

    it('throws UnauthorizedException when the account is disabled', async () => {
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test',
        status: 'disabled',
      });
      await expect(
        service.login(
          { email: 'test@example.com', password: 'Password1' },
          {},
        ),
      ).rejects.toThrow(DomainException);
    });

    it('rejects Google-only accounts with a generic 401 (no password set)', async () => {
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        name: 'Test',
        status: 'active',
      });
      await expect(
        service.login({ email: 'test@example.com', password: 'Password1' }, {}),
      ).rejects.toThrow(DomainException);
      expect(passwordService.compare).not.toHaveBeenCalled();
    });
  });

  describe('googleLogin', () => {
    const profile = {
      googleId: 'google-sub-123',
      email: 'google@example.com',
      emailVerified: true,
      name: 'Google User',
      avatarUrl: 'https://example.com/photo.jpg',
    };

    it('creates a new user + tenant + OWNER membership and audits registration', async () => {
      repos.user.findByGoogleId.mockResolvedValue(null);
      repos.user.findByEmail.mockResolvedValue(null);
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.OWNER },
      ]);

      const principal = await service.googleLogin(profile, {});

      expect(repos.tenant.create).toHaveBeenCalledOnce();
      expect(repos.user.create).toHaveBeenCalledWith({
        email: 'google@example.com',
        name: 'Google User',
        googleId: 'google-sub-123',
        avatarUrl: 'https://example.com/photo.jpg',
      });
      expect(repos.membership.create).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: Role.OWNER,
      });
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.registered' }),
      );
      expect(principal).toEqual({ userId: 'user-1', tenantId: 'tenant-1', role: Role.OWNER });
    });

    it('returns the principal for an existing Google user without creating anything', async () => {
      repos.user.findByGoogleId.mockResolvedValue({
        id: 'user-1',
        email: 'google@example.com',
        passwordHash: null,
        googleId: 'google-sub-123',
        name: 'Google User',
        status: 'active',
      });
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN },
      ]);

      const principal = await service.googleLogin(profile, {});

      expect(repos.user.create).not.toHaveBeenCalled();
      expect(repos.tenant.create).not.toHaveBeenCalled();
      expect(repos.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.google_login' }),
      );
      expect(principal).toEqual({ userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN });
    });

    it('links Google to an existing credentials user with the same verified email', async () => {
      repos.user.findByGoogleId.mockResolvedValue(null);
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'google@example.com',
        passwordHash: 'hashed',
        googleId: null,
        name: 'Google User',
        status: 'active',
      });
      repos.user.linkGoogleId.mockResolvedValue({
        id: 'user-1',
        email: 'google@example.com',
        passwordHash: 'hashed',
        googleId: 'google-sub-123',
        name: 'Google User',
        status: 'active',
      });
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN },
      ]);

      const principal = await service.googleLogin(profile, {});

      expect(repos.user.linkGoogleId).toHaveBeenCalledWith('user-1', 'google-sub-123');
      expect(repos.user.create).not.toHaveBeenCalled();
      expect(principal.userId).toBe('user-1');
    });

    it('rejects an unverified email that matches an existing account', async () => {
      repos.user.findByGoogleId.mockResolvedValue(null);
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'google@example.com',
        passwordHash: 'hashed',
        googleId: null,
        name: 'Google User',
        status: 'active',
      });

      await expect(
        service.googleLogin({ ...profile, emailVerified: false }, {}),
      ).rejects.toThrow(DomainException);
      expect(repos.user.linkGoogleId).not.toHaveBeenCalled();
    });

    it('throws for a disabled Google account', async () => {
      repos.user.findByGoogleId.mockResolvedValue({
        id: 'user-1',
        email: 'google@example.com',
        passwordHash: null,
        googleId: 'google-sub-123',
        name: 'Google User',
        status: 'disabled',
      });

      await expect(service.googleLogin(profile, {})).rejects.toThrow(DomainException);
    });

    it('throws when Google returns no email', async () => {
      await expect(
        service.googleLogin({ ...profile, email: '' }, {}),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('issueSessionForPrincipal', () => {
    it('issues a token pair + profile for a Google principal', async () => {
      repos.user.findById.mockResolvedValue({
        id: 'user-1',
        email: 'google@example.com',
        passwordHash: null,
        googleId: 'google-sub-123',
        name: 'Google User',
        status: 'active',
        avatarUrl: null,
      });

      const result = await service.issueSessionForPrincipal(
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.OWNER },
        {},
      );

      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
      expect(result.user).toMatchObject({
        id: 'user-1',
        email: 'google@example.com',
        role: Role.OWNER,
        tenantId: 'tenant-1',
      });
    });

    it('throws when the principal user is missing or disabled', async () => {
      repos.user.findById.mockResolvedValue(null);
      await expect(
        service.issueSessionForPrincipal(
          { userId: 'ghost', tenantId: 'tenant-1', role: Role.OWNER },
          {},
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('OAuth state', () => {
    it('round-trips the signed state with the sanitized next path', () => {
      const state = service.buildGoogleState('/team');
      expect(service.verifyGoogleState(state)).toEqual({ next: '/team' });
    });

    it('defaults an absent next path to /', () => {
      const state = service.buildGoogleState(undefined);
      expect(service.verifyGoogleState(state)).toEqual({ next: '/' });
    });

    it('blocks open redirects (protocol-relative next)', () => {
      const state = service.buildGoogleState('//evil.example.com');
      expect(service.verifyGoogleState(state)).toEqual({ next: '/' });
    });

    it('rejects tampered or malformed state', () => {
      const state = service.buildGoogleState('/team');
      const [payload, sig] = state.split('.');
      const tampered = `${payload}.${sig}xxxx`;
      expect(service.verifyGoogleState(tampered)).toBeNull();
      expect(service.verifyGoogleState('garbage')).toBeNull();
      expect(service.verifyGoogleState(undefined)).toBeNull();
    });
  });

  describe('refresh', () => {
    it('rotates the session and issues new tokens', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', sid: 'old' });
      repos.session.findActiveByToken.mockResolvedValue({ id: 'old-session' });
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN },
      ]);
      repos.user.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        status: 'active',
      });

      const result = await service.refresh({ refreshToken: 'rt' }, {});
      expect(repos.session.revokeSession).toHaveBeenCalledWith('old-session');
      expect(result.accessToken).toBe('at');
    });

    it('revokes ALL sessions on reuse of a revoked token (theft signal)', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', sid: 'old' });
      // No active session found — token was revoked — reuse detected.
      repos.session.findActiveByToken.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'reused-rt' }, {}),
      ).rejects.toThrow(DomainException);
      expect(repos.session.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
    });

    it('throws UnauthorizedException on invalid refresh token signature', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(new Error('bad signature'));
      await expect(
        service.refresh({ refreshToken: 'garbage' }, {}),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('logout', () => {
    it('revokes the session by refresh token and writes an audit record', async () => {
      await service.logout('user-1', 'tenant-1', 'refresh-token-123', {});
      expect(repos.session.revokeSessionByToken).toHaveBeenCalledWith('refresh-token-123');
      expect(repos.audit.record).toHaveBeenCalledOnce();
    });

    it('skips session revocation when no refresh token is provided', async () => {
      await service.logout('user-1', 'tenant-1', undefined, {});
      expect(repos.session.revokeSessionByToken).not.toHaveBeenCalled();
      expect(repos.audit.record).toHaveBeenCalledOnce();
    });
  });
});
