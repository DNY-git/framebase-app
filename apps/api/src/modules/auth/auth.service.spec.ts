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
import * as fsPromises from 'fs/promises';
import { DomainException } from '../../common/exceptions/domain.exception';
import { Role } from '@constructtrack/types';
import type { AppConfig } from '../../config/configuration';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import type { PasswordStrengthResult } from './password.service';
import { TokenService } from './token.service';
import type { TokenPair, RefreshTokenPayload, AccessTokenPayload } from './token.service';

/**
 * Avatar storage is the only place AuthService touches `fs/promises`, so the
 * module is mocked here: uploads/resolution are then deterministic and the
 * suite never writes a real file. `resolveStorageRoot()` uses `fs` (not
 * `fs/promises`), so the path resolution under test stays real.
 *
 * Default implementation: nothing on disk (`access` rejects), which is the
 * "photo exists only in MongoDB" case.
 */
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
}));

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
      .fn<(access: AccessTokenPayload, refresh: RefreshTokenPayload) => Promise<TokenPair>>()
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
      updatePasswordHash: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
      findAvatar: vi.fn().mockResolvedValue(null),
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
    passwordResetToken: {
      create: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
        status: 'pending',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findPendingByHash: vi.fn(),
      markUsed: vi.fn().mockResolvedValue(undefined),
      invalidatePendingForUser: vi.fn().mockResolvedValue(undefined),
    },
    mailer: {
      sendPasswordResetEmail: vi.fn().mockResolvedValue({ sent: true }),
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
      repos.passwordResetToken as never,
      repos.mailer as never,
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

    it('keeps the organization the refresh token was issued for (not membership[0])', async () => {
      // The user switched to tenant-2 after login — the refresh token claims
      // tenant-2, so the rotated pair must stay there even though tenant-1
      // is their first membership.
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sid: 'old',
        tenantId: 'tenant-2',
      });
      repos.session.findActiveByToken.mockResolvedValue({ id: 'old-session' });
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN },
        { userId: 'user-1', tenantId: 'tenant-2', role: Role.PROJECT_MANAGER },
      ]);
      repos.user.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        status: 'active',
      });

      const result = await service.refresh({ refreshToken: 'rt' }, {});

      expect(result.user.tenantId).toBe('tenant-2');
      expect(result.user.role).toBe(Role.PROJECT_MANAGER);
      // ...and the rotation must carry the claim forward, otherwise the next
      // refresh would lose it again.
      expect(tokenService.generateTokenPair).toHaveBeenCalledWith(
        { sub: 'user-1', tenantId: 'tenant-2', role: Role.PROJECT_MANAGER },
        { sub: 'user-1', sid: 'pending', tenantId: 'tenant-2' },
      );
    });

    it('falls back to the first membership for legacy tokens without a tenant claim', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', sid: 'old' });
      repos.session.findActiveByToken.mockResolvedValue({ id: 'old-session' });
      repos.membership.findByUserId.mockResolvedValue([
        { userId: 'user-1', tenantId: 'tenant-1', role: Role.ADMIN },
        { userId: 'user-1', tenantId: 'tenant-2', role: Role.PROJECT_MANAGER },
      ]);
      repos.user.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        status: 'active',
      });

      const result = await service.refresh({ refreshToken: 'rt' }, {});

      expect(result.user.tenantId).toBe('tenant-1');
      expect(result.user.role).toBe(Role.ADMIN);
    });

    it('falls back to the first membership when the claimed tenant is no longer a membership', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sid: 'old',
        tenantId: 'tenant-9',
      });
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

      expect(result.user.tenantId).toBe('tenant-1');
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

  describe('forgotPassword', () => {
    it('returns the same message regardless of whether the email exists', async () => {
      repos.user.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword('nonexistent@example.com');
      expect(result.message).toContain('If an account exists');
      expect(repos.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates a reset token and sends email for existing user with password', async () => {
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });
      const result = await service.forgotPassword('test@example.com');
      expect(result.message).toContain('If an account exists');
      expect(repos.passwordResetToken.invalidatePendingForUser).toHaveBeenCalledWith('user-1');
      expect(repos.passwordResetToken.create).toHaveBeenCalledOnce();
      expect(repos.mailer.sendPasswordResetEmail).toHaveBeenCalledOnce();
    });

    it('does not send email for Google-only accounts (no passwordHash)', async () => {
      repos.user.findByEmail.mockResolvedValue({
        id: 'user-2',
        email: 'google@example.com',
        passwordHash: null,
      });
      await service.forgotPassword('google@example.com');
      expect(repos.passwordResetToken.create).not.toHaveBeenCalled();
      expect(repos.mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('throws on invalid token hash', async () => {
      repos.passwordResetToken.findPendingByHash.mockResolvedValue(null);
      await expect(
        service.resetPassword('invalid-token', 'NewPassword1'),
      ).rejects.toThrow(DomainException);
    });

    it('throws on expired token', async () => {
      repos.passwordResetToken.findPendingByHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000), // expired
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        service.resetPassword('expired-token', 'NewPassword1'),
      ).rejects.toThrow(DomainException);
    });

    it('updates password hash, marks token used, and revokes sessions on success', async () => {
      repos.passwordResetToken.findPendingByHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
        status: 'pending',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.resetPassword('valid-token', 'NewPassword1');
      expect(repos.user.updatePasswordHash).toHaveBeenCalledWith('user-1', 'hashed-password');
      expect(repos.passwordResetToken.markUsed).toHaveBeenCalledWith('token-1');
      expect(repos.passwordResetToken.invalidatePendingForUser).toHaveBeenCalledWith('user-1');
      expect(repos.session.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
      expect(result.message).toContain('Password has been reset');
    });
  });
  describe('avatars', () => {
    const image = Buffer.from('fake-jpeg-bytes');
    /** Resets the mocked disk probe so each test states its own filesystem. */
    const disk = () => {
      const access = vi.mocked(fsPromises.access);
      access.mockReset();
      return access;
    };

    it('mirrors uploaded photo bytes into the database and versions the URL', async () => {
      repos.user.findById.mockResolvedValue({ id: 'user-1', avatarUrl: null });

      const url = await service.setAvatar('user-1', image, 'image/jpeg');

      expect(url).toMatch(/^avatars\/user-1\.jpg\?v=\d+$/);
      // The durable copy is what makes the photo survive a restart of the
      // API process (the hosted filesystem is ephemeral).
      expect(repos.user.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          avatarUrl: expect.stringMatching(/^avatars\/user-1\.jpg\?v=\d+$/),
          avatarData: image,
          avatarMimeType: 'image/jpeg',
        }),
      );
      // The disk write stays as a backup for legacy serving.
      expect(vi.mocked(fsPromises.writeFile)).toHaveBeenCalledOnce();
    });

    it('keeps oversized photos disk-only so database documents stay small', async () => {
      repos.user.findById.mockResolvedValue({ id: 'user-1', avatarUrl: null });
      const oversized = Buffer.alloc(4 * 1024 * 1024 + 1); // > AVATAR_DB_MAX_BYTES, <= 10 MB

      await service.setAvatar('user-1', oversized, 'image/png');

      expect(repos.user.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatarData: null, avatarMimeType: null }),
      );
      expect(vi.mocked(fsPromises.writeFile)).toHaveBeenCalledOnce();
    });

    it('serves the database copy when present (no filesystem dependency)', async () => {
      repos.user.findAvatar.mockResolvedValue({ data: image, mimeType: 'image/jpeg' });

      const resolved = await service.resolveAvatar('user-1');

      expect(resolved).toEqual({ source: 'db', data: image, mimeType: 'image/jpeg' });
      expect(vi.mocked(fsPromises.access)).not.toHaveBeenCalled();
    });

    it('falls back to the disk file for photos with no database copy', async () => {
      repos.user.findAvatar.mockResolvedValue(null);
      disk()
        .mockRejectedValueOnce(new Error('ENOENT')) // avatars/user-1.jpg
        .mockResolvedValueOnce(undefined); // avatars/user-1.png

      const resolved = await service.resolveAvatar('user-1');

      expect(resolved?.source).toBe('disk');
      if (resolved?.source === 'disk') {
        expect(resolved.absPath).toContain('user-1.png');
        expect(resolved.mimeType).toBe('image/png');
      }
    });

    it('keeps serving from disk when the database read fails', async () => {
      repos.user.findAvatar.mockRejectedValue(new Error('Mongo unavailable'));
      disk().mockResolvedValue(undefined);

      const resolved = await service.resolveAvatar('user-1');

      expect(resolved?.source).toBe('disk');
    });

    it('returns null when the photo exists in neither MongoDB nor on disk', async () => {
      repos.user.findAvatar.mockResolvedValue(null);
      disk().mockRejectedValue(new Error('ENOENT'));

      await expect(service.resolveAvatar('user-1')).resolves.toBeNull();
    });

    it('removeAvatar clears the database copy and the stored reference', async () => {
      repos.user.findById.mockResolvedValue({ id: 'user-1', avatarUrl: 'avatars/user-1.jpg?v=1' });

      await service.removeAvatar('user-1');

      expect(repos.user.updateProfile).toHaveBeenCalledWith('user-1', {
        avatarUrl: null,
        avatarData: null,
        avatarMimeType: null,
      });
      expect(vi.mocked(fsPromises.unlink)).toHaveBeenCalledOnce();
    });
  });

});
