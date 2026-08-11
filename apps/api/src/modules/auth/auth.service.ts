/**
 * Auth service — the core authentication business logic.
 *
 * Implements register, login, refresh, logout, and profile retrieval.
 * All mutating operations are audited. Credential failures return a
 * generic 401 (no enumeration). Refresh tokens are rotated on each use;
 * reuse of a revoked token revokes the entire session family (theft signal).
 *
 * See:
 *  - docs/security/authentication.md (security policy)
 *  - docs/api/authentication.md (API flow)
 *  - docs/security/authorization.md (role model)
 *  - PROJECT_RULES.md §5, §8 (backend + security rules)
 */
import {
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { ErrorCode, Role } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import type { AppConfig } from '../../config/configuration';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { SessionRepository } from './repositories/session.repository';

/** Client metadata captured at auth time for session tracking. */
export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const AVATAR_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const AVATAR_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Response shape for register/login/refresh — the token pair + profile. */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    tenantId: string;
    avatarUrl: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly tenantRepository: TenantRepository,
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Registers a new user and creates their initial tenant + admin membership.
   *
   * The first user in a new tenant becomes the admin, enabling them to
   * invite the rest of the team (docs/security/authorization.md → Admin &
   * Bootstrap). Returns a token pair so the client is immediately authed.
   */
  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResult> {
    // Defense-in-depth password check (DTO already validates).
    const strength = this.passwordService.validateStrength(dto.password);
    if (!strength.valid) {
      throw new DomainException(ErrorCode.AUTH_WEAK_PASSWORD, HttpStatus.CONFLICT, strength.errors.join(' '));
    }

    // Create tenant (slug derived from name, retry on collision).
    let tenant;
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = this.slugify(dto.name);
      try {
        tenant = await this.tenantRepository.create({
          name: `${dto.name} Organization`,
          slug,
        });
        break;
      } catch (err: unknown) {
        if (attempt === 4) throw err;
        continue;
      }
    }
    if (!tenant) {
      throw new DomainException(ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to create tenant.');
    }

    // Create user with hashed+peppered password.
    // The duplicate-key check and create are intentionally not in a
    // transaction — Mongoose/MongoDB guarantees a unique index on email,
    // so a race-condition duplicate lands here as error code 11000.
    const passwordHash = await this.passwordService.hash(dto.password);
    let user;
    try {
      user = await this.userRepository.create({
        email: dto.email,
        passwordHash,
        name: dto.name,
      });
    } catch (err: unknown) {
      // MongoDB duplicate-key error (code 11000) means the email was
      // inserted by a concurrent request between the (now-removed)
      // existsByEmail check and this create.
      if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
        throw new DomainException(ErrorCode.AUTH_DUPLICATE_EMAIL, HttpStatus.CONFLICT, 'A user with this email already exists.');
      }
      throw err;
    }

    // Link user to tenant as owner (the founder of their organization).
    await this.membershipRepository.create({
      userId: user.id,
      tenantId: tenant.id,
      role: Role.OWNER,
    });

    // Issue session + token pair.
    const result = await this.issueTokens(
      user.id,
      tenant.id,
      Role.OWNER,
      meta,
    );

    // Audit.
    await this.auditService.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'user.registered',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, name: user.name },
      correlationId: meta.correlationId,
    });

    return {
      ...result,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: Role.OWNER,
        tenantId: tenant.id,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  /**
   * Authenticates a user with email/password and issues a token pair.
   * Returns a generic 401 on any failure (no enumeration).
   */
  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new DomainException(ErrorCode.AUTH_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, 'Invalid credentials.');
    }

    const valid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );
    if (!valid) {
      throw new DomainException(ErrorCode.AUTH_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, 'Invalid credentials.');
    }

    if (user.status !== 'active') {
      throw new DomainException(ErrorCode.AUTH_DISABLED_ACCOUNT, HttpStatus.UNAUTHORIZED, 'Account is disabled.');
    }

    // Load membership to get the tenant + role.
    const membership =
      await this.membershipRepository.findByUserId(user.id);
    if (!membership || membership.length === 0) {
      throw new DomainException(ErrorCode.AUTH_NO_MEMBERSHIP, HttpStatus.UNAUTHORIZED, 'No tenant membership found.');
    }
    // Use the first membership as the active tenant context.
    const active = membership[0];

    await this.userRepository.updateLastLogin(user.id);

    const result = await this.issueTokens(
      user.id,
      active.tenantId,
      active.role,
      meta,
    );

    await this.auditService.record({
      tenantId: active.tenantId,
      actorId: user.id,
      action: 'user.login',
      entityType: 'User',
      entityId: user.id,
      correlationId: meta.correlationId,
    });

    return {
      ...result,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: active.role,
        tenantId: active.tenantId,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  /**
   * Rotates the refresh token: verifies the old token, revokes its session,
   * and issues a fresh pair. Reuse of a revoked token revokes ALL sessions
   * (theft signal) and forces re-authentication.
   */
  async refresh(dto: RefreshDto, meta: RequestMeta): Promise<AuthResult> {
    // Verify JWT signature + expiry.
    let refreshPayload;
    try {
      refreshPayload = await this.tokenService.verifyRefreshToken(
        dto.refreshToken,
      );
    } catch {
      throw new DomainException(ErrorCode.AUTH_INVALID_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED, 'Invalid refresh token.');
    }

    // Look up the active session by token hash.
    const session = await this.sessionRepository.findActiveByToken(
      dto.refreshToken,
    );

    if (!session) {
      // Token is valid JWT but session is revoked/missing → possible theft.
      // Revoke ALL sessions for this user as a precaution.
      this.logger.warn(
        `Refresh token reuse detected for user ${refreshPayload.sub} — revoking all sessions.`,
      );
      await this.sessionRepository.revokeAllUserSessions(refreshPayload.sub);
      throw new DomainException(ErrorCode.AUTH_REFRESH_TOKEN_REVOKED, HttpStatus.UNAUTHORIZED, 'Refresh token has been revoked. Please log in again.');
    }

    // Revoke the old session (rotation).
    await this.sessionRepository.revokeSession(session.id);

    // Load membership to get tenant + role for the access token.
    const membership = await this.membershipRepository.findByUserId(
      refreshPayload.sub,
    );
    if (!membership || membership.length === 0) {
      throw new DomainException(ErrorCode.AUTH_NO_MEMBERSHIP, HttpStatus.UNAUTHORIZED, 'No tenant membership found.');
    }
    const active = membership[0];
    const user = await this.userRepository.findById(refreshPayload.sub);
    if (!user || user.status !== 'active') {
      throw new DomainException(ErrorCode.AUTH_DISABLED_ACCOUNT, HttpStatus.UNAUTHORIZED, 'Account is disabled or not found.');
    }

    const result = await this.issueTokens(
      user.id,
      active.tenantId,
      active.role,
      meta,
    );

    return {
      ...result,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: active.role,
        tenantId: active.tenantId,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  /**
   * Logs out the user by revoking their session.
   * The access token naturally expires; logout invalidates the refresh token.
   *
   * The refresh token is accepted in the request body so the server can
   * revoke the matching session. If the client cannot provide the refresh
   * token (e.g., it was lost), only an audit record is created.
   */
  async logout(
    userId: string,
    tenantId: string,
    refreshToken: string | undefined,
    meta: RequestMeta,
  ): Promise<void> {
    if (refreshToken) {
      await this.sessionRepository.revokeSessionByToken(refreshToken);
    }
    await this.auditService.record({
      tenantId,
      actorId: userId,
      action: 'user.logout',
      entityType: 'User',
      entityId: userId,
      correlationId: meta.correlationId,
    });
  }

  /**
   * Returns the current user's profile + active membership.
   */
  async getMe(userId: string, tenantId: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: Role;
    tenantId: string;
    avatarUrl: string | null;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }
    const membership = await this.membershipRepository.findByUserAndTenant(
      userId,
      tenantId,
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership?.role ?? Role.VIEWER,
      tenantId,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  /**
   * Updates the current user's editable profile fields (name).
   * Email and role are immutable and rejected by the DTO.
   */
  async updateProfile(
    userId: string,
    tenantId: string,
    dto: UpdateProfileDto,
  ): Promise<{
    id: string;
    email: string;
    name: string;
    role: Role;
    tenantId: string;
    avatarUrl: string | null;
  }> {
    const user = await this.userRepository.updateProfile(userId, {
      name: dto.name,
    });
    if (!user) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }
    const membership = await this.membershipRepository.findByUserAndTenant(
      userId,
      tenantId,
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership?.role ?? Role.VIEWER,
      tenantId,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  /**
   * Persists a user's avatar image on local disk and records the relative
   * storage key (`avatars/<userId>.<ext>`) on the user document. Old avatar
   * files are removed when replaced or deleted.
   *
   * Mirrors the documents storage driver (ADR-002): object storage arrives
   * later; this is the local driver.
   */
  async setAvatar(
    userId: string,
    buffer: Buffer | undefined,
    mimeType: string | undefined,
  ): Promise<string | null> {
    if (!buffer || !mimeType) {
      throw new DomainException(ErrorCode.AUTH_INVALID_AVATAR, HttpStatus.BAD_REQUEST, 'An image file is required (field "avatar").');
    }
    const ext = AVATAR_EXT_BY_MIME[mimeType];
    if (!ext) {
      throw new DomainException(ErrorCode.AUTH_INVALID_AVATAR, HttpStatus.BAD_REQUEST, 'Unsupported image type. Use JPEG, PNG, or WebP.');
    }
    if (buffer.length > AVATAR_MAX_BYTES) {
      throw new DomainException(ErrorCode.AUTH_INVALID_AVATAR, HttpStatus.BAD_REQUEST, 'Avatar image must be 2 MB or smaller.');
    }

    const current = await this.userRepository.findById(userId);
    if (!current) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }

    const storageKey = `avatars/${userId}.${ext}`;
    const dest = this.avatarAbsPath(storageKey);
    try {
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.writeFile(dest, buffer);
    } catch {
      throw new DomainException(ErrorCode.AUTH_INVALID_AVATAR, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to persist avatar image.');
    }

    const updated = await this.userRepository.updateProfile(userId, {
      avatarUrl: storageKey,
    });
    if (!updated) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }

    // Remove the previous avatar file (different extension ⇒ different file).
    if (current.avatarUrl && current.avatarUrl !== storageKey) {
      await fsp.unlink(this.avatarAbsPath(current.avatarUrl)).catch(() => {});
    }

    return storageKey;
  }

  /** Removes the user's avatar (file + DB record). */
  async removeAvatar(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.avatarUrl) return;
    await this.userRepository.updateProfile(userId, { avatarUrl: null });
    await fsp.unlink(this.avatarAbsPath(user.avatarUrl)).catch(() => {});
  }

  /**
   * Resolves an avatar's absolute path + MIME type for serving.
   * Returns null when the user has no avatar.
   */
  async resolveAvatar(userId: string): Promise<{ absPath: string; mimeType: string } | null> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.avatarUrl) return null;
    const absPath = this.avatarAbsPath(user.avatarUrl);
    try {
      await fsp.access(absPath);
    } catch {
      return null;
    }
    const ext = path.extname(user.avatarUrl).replace('.', '').toLowerCase();
    return { absPath, mimeType: AVATAR_MIME_BY_EXT[ext] ?? 'application/octet-stream' };
  }

  private avatarAbsPath(storageKey: string): string {
    return path.join(
      process.cwd(),
      'storage',
      ...storageKey.split('/'),
    );
  }

  /**
   * Creates a session and issues a token pair for a user.
   * Private helper shared by register, login, and refresh.
   *
   * The refresh token is generated once with a placeholder session id, then
   * the session stores a hash of THAT token, and the same token is returned
   * to the client. This ensures the client's refresh token matches the
   * session's hash on subsequent rotation.
   */
  private async issueTokens(
    userId: string,
    tenantId: string,
    role: Role,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const refreshTtl = this.configService.get<string>('jwtRefreshTtl', {
      infer: true,
    });
    const ttlSeconds = this.ttlToSeconds(refreshTtl);

    // Issue the token pair once. The refresh token references a placeholder
    // session id initially.
    const tokenPair = await this.tokenService.generateTokenPair(
      { sub: userId, tenantId, role },
      { sub: userId, sid: 'pending' },
    );

    // Store a hash of the refresh token in a new session. The session id
    // would ideally be embedded in the token, but since we need the session
    // to exist first, we accept that the token's `sid` is 'pending' and
    // rely on the token-hash lookup for rotation (not the sid claim).
    await this.sessionRepository.createSession({
      userId,
      refreshToken: tokenPair.refreshToken,
      ttlSeconds,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: userId,
        email: '', // filled in by caller
        name: '', // filled in by caller
        role,
        tenantId,
        avatarUrl: null,
      },
    };
  }

  /**
   * Converts a tenant/user name to a URL-safe slug.
   * Appends a short random suffix to avoid collisions.
   */
  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org';
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }

  /**
   * Converts a JWT TTL string (e.g., "7d") to seconds.
   */
  private ttlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 604800; // default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 604800;
    }
  }
}
