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
import { createHmac, timingSafeEqual, randomBytes, createHash } from 'crypto';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { ErrorCode, Role } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { resolveStorageRoot } from '../../common/utils/storage-root.util';
import type { AppConfig } from '../../config/configuration';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { GooglePrincipal, GoogleProfile } from './google.strategy';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { SessionRepository } from './repositories/session.repository';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';
import { MailerService } from '../../common/mailer/mailer.service';

/** Client metadata captured at auth time for session tracking. */
export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
}

const AVATAR_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Largest photo that is *also* mirrored into MongoDB. Real uploads come from
 * the crop editor as a 512 px square (tens of KB); the cap simply keeps an
 * unusually large original from bloating a user document (MongoDB's limit is
 * 16 MB per document). Anything larger stays disk-only.
 */
const AVATAR_DB_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

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

/**
 * Where an avatar's bytes came from — MongoDB (durable, preferred) or the
 * legacy on-disk file.
 */
export type ResolvedAvatar =
  | { source: 'db'; data: Buffer; mimeType: string }
  | { source: 'disk'; absPath: string; mimeType: string };

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
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly mailerService: MailerService,
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
   * Authenticates a user via Google OAuth profile.
   *
   * Resolution order:
   *  1. googleId already known → existing Google user.
   *  2. googleId unknown, but a credentials user holds the same (verified)
   *     email → link the Google account to that user.
   *  3. otherwise → create a new user + their own tenant (OWNER), mirroring
   *     register(). Google users have no password; they sign in via Google.
   *
   * Returns the session principal; the caller turns it into a one-time code.
   */
  async googleLogin(profile: GoogleProfile, meta: RequestMeta): Promise<GooglePrincipal> {
    if (!profile.email) {
      throw new DomainException(
        ErrorCode.AUTH_GOOGLE_EMAIL_REQUIRED,
        HttpStatus.UNAUTHORIZED,
        'Google did not return an email address for this account.',
      );
    }

    let user = await this.userRepository.findByGoogleId(profile.googleId);
    let isNewUser = false;
    let tenantId = '';

    if (user) {
      if (user.status !== 'active') {
        throw new DomainException(ErrorCode.AUTH_DISABLED_ACCOUNT, HttpStatus.UNAUTHORIZED, 'Account is disabled.');
      }
    } else {
      // Link to an existing credentials account when Google verified the email.
      user = await this.userRepository.findByEmail(profile.email);
      if (user) {
        if (user.status !== 'active') {
          throw new DomainException(ErrorCode.AUTH_DISABLED_ACCOUNT, HttpStatus.UNAUTHORIZED, 'Account is disabled.');
        }
        if (!profile.emailVerified) {
          // The Google account claims this email but Google has not verified
          // it — never hand over an existing account on an unverified claim.
          throw new DomainException(ErrorCode.AUTH_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, 'Google email is not verified.');
        }
        user = await this.userRepository.linkGoogleId(user.id, profile.googleId);
      } else {
        // New user — create their own tenant + OWNER membership (like register).
        isNewUser = true;
        let tenant;
        for (let attempt = 0; attempt < 5; attempt++) {
          const slug = this.slugify(profile.name);
          try {
            tenant = await this.tenantRepository.create({
              name: `${profile.name} Organization`,
              slug,
            });
            break;
          } catch {
            if (attempt === 4) throw new Error('Failed to create tenant.');
          }
        }
        if (!tenant) {
          throw new DomainException(ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to create tenant.');
        }
        tenantId = tenant.id;
        try {
          user = await this.userRepository.create({
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl,
          });
        } catch (err: unknown) {
          if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
            throw new DomainException(ErrorCode.AUTH_GOOGLE_EMAIL_REQUIRED, HttpStatus.CONFLICT, 'An account with this email already exists. Sign in with email and password instead.');
          }
          throw err;
        }
        await this.membershipRepository.create({
          userId: user.id,
          tenantId: tenant.id,
          role: Role.OWNER,
        });
      }
    }

    if (!user) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }

    // Resolve the active membership (tenant + role) for the session.
    const membership = await this.membershipRepository.findByUserId(user.id);
    if (!membership || membership.length === 0) {
      throw new DomainException(ErrorCode.AUTH_NO_MEMBERSHIP, HttpStatus.UNAUTHORIZED, 'No tenant membership found.');
    }
    const active = membership[0];
    tenantId = tenantId || active.tenantId;

    await this.userRepository.updateLastLogin(user.id);

    await this.auditService.record({
      tenantId,
      actorId: user.id,
      action: isNewUser ? 'user.registered' : 'user.google_login',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, provider: 'google' },
      correlationId: meta.correlationId,
    });

    return { userId: user.id, tenantId, role: active.role };
  }

  /**
   * Issues a fresh token pair + profile for a principal obtained from a
   * Google one-time code (the OAuth callback already ran the audit).
   */
  async issueSessionForPrincipal(
    principal: GooglePrincipal,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const user = await this.userRepository.findById(principal.userId);
    if (!user || user.status !== 'active') {
      throw new DomainException(ErrorCode.AUTH_DISABLED_ACCOUNT, HttpStatus.UNAUTHORIZED, 'Account is disabled or not found.');
    }
    const result = await this.issueTokens(user.id, principal.tenantId, principal.role, meta);
    return {
      ...result,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: principal.role,
        tenantId: principal.tenantId,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  /**
   * Builds the signed OAuth `state` parameter: base64url(payload).hmac.
   * The HMAC (keyed with the JWT access secret) prevents tampering, which
   * would otherwise enable open-redirects through the `next` path.
   */
  buildGoogleState(next: string | undefined): string {
    const payload = Buffer.from(JSON.stringify({ next: this.sanitizeNext(next) }), 'utf8').toString('base64url');
    const sig = this.signState(payload);
    return `${payload}.${sig}`;
  }

  /** Verifies the signed state and returns its payload (or null). */
  verifyGoogleState(state: string | undefined): { next: string } | null {
    if (!state) return null;
    const [payload, sig] = state.split('.');
    if (!payload || !sig) return null;
    const expected = this.signState(payload);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { next?: string };
      return { next: this.sanitizeNext(parsed.next) };
    } catch {
      return null;
    }
  }

  /** Redirect target for failed callbacks (access denied, bad state). */
  googleErrorRedirect(reason: string): string {
    const appUrl = this.configService.get<string>('appUrl', { infer: true });
    return `${appUrl.replace(/\/$/, '')}/auth/google/callback?error=${encodeURIComponent(reason)}`;
  }

  /**
   * Sends a password reset email if an account exists for the given email.
   * Always returns the same response regardless of whether the email is
   * registered — prevents account enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (user && user.passwordHash) {
      // Generate a cryptographically random token.
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      // Invalidate any pending reset tokens for this user.
      await this.passwordResetTokenRepository.invalidatePendingForUser(user.id);

      // Create a new token with configured expiry.
      const ttlSeconds = this.ttlToSeconds(
        this.configService.get('passwordResetTtl', { infer: true }),
      );
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Send the email with the raw token in the link.
      const appUrl = this.configService.get<string>('appUrl', { infer: true });
      const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

      await this.mailerService.sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresAt,
      });
    }

    // Always return the same message — no enumeration.
    return {
      message: 'If an account exists for this email, a reset link has been sent.',
    };
  }

  /**
   * Resets a user's password using a valid, unexpired, unused reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Hash the raw token to look it up.
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resetToken = await this.passwordResetTokenRepository.findPendingByHash(tokenHash);

    if (!resetToken) {
      throw new DomainException(
        ErrorCode.AUTH_PASSWORD_RESET_INVALID,
        HttpStatus.BAD_REQUEST,
        'Invalid or expired reset token.',
      );
    }

    if (new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw new DomainException(
        ErrorCode.AUTH_PASSWORD_RESET_EXPIRED,
        HttpStatus.BAD_REQUEST,
        'Reset token has expired. Please request a new one.',
      );
    }

    // Validate password strength (defense-in-depth).
    const strength = this.passwordService.validateStrength(newPassword);
    if (!strength.valid) {
      throw new DomainException(
        ErrorCode.AUTH_WEAK_PASSWORD,
        HttpStatus.CONFLICT,
        strength.errors.join(' '),
      );
    }

    // Hash the new password and update the user.
    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.updatePasswordHash(resetToken.userId, passwordHash);

    // Mark the token as used.
    await this.passwordResetTokenRepository.markUsed(resetToken.id);

    // Invalidate all pending reset tokens for this user.
    await this.passwordResetTokenRepository.invalidatePendingForUser(resetToken.userId);

    // Revoke all existing sessions for this user (security best practice).
    await this.sessionRepository.revokeAllUserSessions(resetToken.userId);

    this.logger.log(`Password reset completed for user ${resetToken.userId}`);

    return { message: 'Password has been reset. You can now sign in with your new password.' };
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

    // Google-only accounts have no password — reject with the generic 401
    // (no enumeration) and point the user at Google sign-in.
    if (!user.passwordHash) {
      throw new DomainException(ErrorCode.AUTH_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, 'This account uses Google sign-in.');
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

    // Load memberships to get tenant + role for the access token.
    const memberships = await this.membershipRepository.findByUserId(
      refreshPayload.sub,
    );
    if (!memberships || memberships.length === 0) {
      throw new DomainException(ErrorCode.AUTH_NO_MEMBERSHIP, HttpStatus.UNAUTHORIZED, 'No tenant membership found.');
    }
    // Keep the organization the session was issued for — the refresh token
    // carries it as a claim. Tokens minted before that claim existed, or
    // tokens whose organization has since been left, fall back to the user's
    // first membership (the pre-existing behaviour).
    const claimedTenantId = refreshPayload.tenantId;
    const claimed = claimedTenantId
      ? memberships.find((m) => m.tenantId === claimedTenantId)
      : undefined;
    if (claimedTenantId && !claimed) {
      this.logger.warn(
        `Refresh for user ${refreshPayload.sub} names tenant ${claimedTenantId}, which is no longer among their memberships — falling back to ${memberships[0].tenantId}.`,
      );
    }
    const active = claimed ?? memberships[0];
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
      throw new DomainException(ErrorCode.AUTH_INVALID_AVATAR, HttpStatus.BAD_REQUEST, `Avatar image must be ${AVATAR_MAX_BYTES / (1024 * 1024)} MB or smaller.`);
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

    // Version the URL so browsers bust their 24h cache when the photo is
    // replaced — otherwise a re-upload with the same extension keeps the
    // old cached image forever (same URL, same `?v=`).
    const avatarUrl = `${storageKey}?v=${Date.now()}`;
    // Mirror the bytes into the document as well. Serving prefers this copy,
    // so the photo survives a restart of the API process (the hosted
    // filesystem is ephemeral) instead of 404ing after a reload.
    const keepInDb = buffer.length <= AVATAR_DB_MAX_BYTES;
    const updated = await this.userRepository.updateProfile(userId, {
      avatarUrl,
      avatarData: keepInDb ? buffer : null,
      avatarMimeType: keepInDb ? mimeType : null,
    });
    if (!updated) {
      throw new DomainException(ErrorCode.AUTH_USER_NOT_FOUND, HttpStatus.UNAUTHORIZED, 'User not found.');
    }

    // Remove the previous avatar file (different extension ⇒ different file).
    if (current.avatarUrl && this.stripAvatarVersion(current.avatarUrl) !== storageKey) {
      await fsp.unlink(this.avatarAbsPath(this.stripAvatarVersion(current.avatarUrl))).catch(() => {});
    }

    return avatarUrl;
  }

  /** Removes the user's avatar (database copy, file, and DB reference). */
  async removeAvatar(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.avatarUrl) return;
    await this.userRepository.updateProfile(userId, {
      avatarUrl: null,
      avatarData: null,
      avatarMimeType: null,
    });
    await fsp.unlink(this.avatarAbsPath(this.stripAvatarVersion(user.avatarUrl))).catch(() => {});
  }

  /**
   * Resolves an avatar for serving.
   *
   * The MongoDB copy is preferred because it is durable — the hosted
   * filesystem is ephemeral, so a disk-only photo can point at a file that no
   * longer exists after a restart. Photos uploaded before the mirror existed
   * (and oversized ones) still resolve from disk, and a database error falls
   * back to disk as well so avatars keep serving while Mongo is unreachable.
   */
  async resolveAvatar(userId: string): Promise<ResolvedAvatar | null> {
    const stored = await this.userRepository
      .findAvatar(userId)
      .catch(() => null);
    if (stored) {
      return { source: 'db', data: stored.data, mimeType: stored.mimeType };
    }

    // Legacy / oversized / Mongo-unreachable fallback: probe the three
    // supported extensions on disk.
    for (const ext of ['jpg', 'png', 'webp']) {
      const absPath = this.avatarAbsPath(`avatars/${userId}.${ext}`);
      try {
        await fsp.access(absPath);
        return { source: 'disk', absPath, mimeType: AVATAR_MIME_BY_EXT[ext] };
      } catch {
        // Try the next extension.
      }
    }
    return null;
  }

  private avatarAbsPath(storageKey: string): string {
    return path.join(
      resolveStorageRoot(),
      'storage',
      ...storageKey.split('/'),
    );
  }

  /** Strips the cache-busting version query from a stored avatar URL. */
  private stripAvatarVersion(key: string): string {
    return key.split('?')[0];
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
    // session id initially; the tenant claim is what lets `refresh()` keep the
    // user in the organization they were actually working in.
    const tokenPair = await this.tokenService.generateTokenPair(
      { sub: userId, tenantId, role },
      { sub: userId, sid: 'pending', tenantId },
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

  /** HMAC-SHA256 signature for the OAuth state payload. */
  private signState(payload: string): string {
    const secret = this.configService.get<string>('jwtAccessSecret', { infer: true });
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  /** Only allow same-app paths — blocks open redirects (e.g. `//evil.com`). */
  private sanitizeNext(next: string | undefined): string {
    if (!next) return '/';
    if (!next.startsWith('/') || next.startsWith('//')) return '/';
    return next;
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
