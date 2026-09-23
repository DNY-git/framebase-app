/**
 * Token service — JWT access/refresh token generation and verification.
 *
 * Issues a short-lived access token (15 min default) carrying identity
 * payload, and a longer-lived refresh token (7 days default) that references
 * a server-side session. Both use distinct signing secrets (HS256) per
 * docs/security/authentication.md → Token Security.
 *
 * Tokens carry the minimum identity payload — no sensitive data.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@constructtrack/types';
import type { AppConfig } from '../../config/configuration';

export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  sid: string; // sessionId
  /**
   * Tenant (organization) the pair was issued for. Carried through every
   * rotation so a refresh keeps the user in the organization they switched
   * to. Optional so refresh tokens minted before this claim existed still
   * verify — `AuthService.refresh` falls back to the user's first membership
   * for those.
   */
  tenantId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token expiry in seconds (for client-side expiry handling). */
  expiresIn: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Generates a fresh access + refresh token pair.
   * The refresh token references the session id so the server can revoke it.
   */
  async generateTokenPair(
    access: AccessTokenPayload,
    refresh: RefreshTokenPayload,
  ): Promise<TokenPair> {
    const accessTtl = this.configService.get<string>('jwtAccessTtl', {
      infer: true,
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: access.sub,
        tenantId: access.tenantId,
        role: access.role,
      },
      {
        secret: this.configService.get<string>('jwtAccessSecret', {
          infer: true,
        }),
        expiresIn: accessTtl,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: refresh.sub,
        sid: refresh.sid,
        // Carry the active organization through rotations: without this claim
        // a refresh silently moved a multi-org user back to their first
        // membership, so the app looked like it had "forgotten" the
        // organization/profile context they were working in.
        ...(refresh.tenantId ? { tenantId: refresh.tenantId } : {}),
      },
      {
        secret: this.configService.get<string>('jwtRefreshSecret', {
          infer: true,
        }),
        expiresIn: this.configService.get<string>('jwtRefreshTtl', {
          infer: true,
        }),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ttlToSeconds(accessTtl),
    };
  }

  /**
   * Verifies an access token. Throws on invalid/expired.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      tenantId: string;
      role: Role;
    }>(token, {
      secret: this.configService.get<string>('jwtAccessSecret', {
        infer: true,
      }),
    });
    return { sub: payload.sub, tenantId: payload.tenantId, role: payload.role };
  }

  /**
   * Verifies a refresh token. Throws on invalid/expired.
   * `tenantId` is absent on tokens minted before the claim was introduced.
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      sid: string;
      tenantId?: string;
    }>(token, {
      secret: this.configService.get<string>('jwtRefreshSecret', {
        infer: true,
      }),
    });
    return { sub: payload.sub, sid: payload.sid, tenantId: payload.tenantId };
  }

  /**
   * Converts a JWT TTL string (e.g., "15m", "7d", "3600s") to seconds.
   */
  private ttlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 900; // default 15 min
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
        return 900;
    }
  }
}
