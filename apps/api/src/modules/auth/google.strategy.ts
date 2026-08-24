/**
 * GoogleStrategy — passport-google-oauth20 strategy for "Sign in with Google".
 *
 * The strategy is registered conditionally: when GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET are absent the provider factory returns null and
 * `configured` stays false — the auth endpoints then answer 503 instead of
 * crashing boot (email/password auth is unaffected).
 *
 * `validate` runs after Google completes the OAuth exchange: it finds or
 * creates the local user via AuthService.googleLogin and returns the
 * session principal (userId, tenantId, role) that the callback controller
 * turns into a short-lived one-time code for the SPA.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { Role } from '@constructtrack/types';
import { AuthService } from './auth.service';

/** Principal attached to req.user by the callback flow. */
export interface GooglePrincipal {
  userId: string;
  tenantId: string;
  role: Role;
}

/** Normalized Google profile consumed by the auth service. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  /** True when the strategy was constructed with real credentials. */
  static configured = false;

  constructor(
    private readonly authService: AuthService,
    clientId: string,
    clientSecret: string,
    callbackUrl: string,
  ) {
    super({
      clientID: clientId,
      clientSecret,
      callbackURL: callbackUrl,
      scope: ['profile', 'email'],
    });
    GoogleStrategy.configured = true;
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<GooglePrincipal> {
    const raw = profile as Profile & { _json?: { email_verified?: boolean } };
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      emailVerified: raw._json?.email_verified !== false,
      name: profile.displayName || profile.name?.givenName || 'Google User',
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    return this.authService.googleLogin(googleProfile, {});
  }

  /**
   * Builds the Google consent-screen URL. passport-oauth2 does not expose
   * `authorizeURL` on the strategy — the underlying OAuth2 client owns
   * `getAuthorizeUrl`, which only adds `client_id` (no `response_type` /
   * `redirect_uri`). `_oauth2` is documented as protected; accessed here
   * with a narrow typed surface, replicating passport-oauth2's params.
   */
  authorizeURLForClient(options: {
    scope: string[] | string;
    state: string;
    accessType: string;
  }): string {
    const self = this as unknown as {
      _oauth2: { getAuthorizeUrl: (o: Record<string, unknown>) => string };
      _callbackURL: string;
    };
    const scope = Array.isArray(options.scope)
      ? options.scope.join(' ')
      : options.scope;
    return self._oauth2.getAuthorizeUrl({
      ...options,
      scope,
      response_type: 'code',
      redirect_uri: self._callbackURL,
    });
  }
}