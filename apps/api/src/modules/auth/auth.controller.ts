/**
 * Auth controller — HTTP endpoints for authentication.
 *
 *   POST /api/v1/auth/register   (public)  → 201 + token pair
 *   POST /api/v1/auth/login      (public)  → 200 + token pair
 *   POST /api/v1/auth/refresh    (public)  → 200 + new token pair
 *   POST /api/v1/auth/logout     (authed)  → 204
 *   GET  /api/v1/auth/me         (authed)  → 200 + profile
 *   PATCH /api/v1/auth/me        (authed)  → 200 + updated profile
 *   POST   /api/v1/auth/me/avatar  (authed) → 200 + avatarUrl (multipart)
 *   DELETE /api/v1/auth/me/avatar  (authed) → 204
 *   GET  /api/v1/auth/:userId/avatar (public) → 200 + image or 404
 *   GET  /api/v1/auth/google     (public)  → 302 to Google consent
 *   GET  /api/v1/auth/google/callback (public) → 302 to SPA with one-time code
 *   POST /api/v1/auth/google/exchange (public) → 200 + token pair (from code)
 *
 * Controllers stay thin — they translate HTTP ↔ domain and delegate to
 * AuthService (PROJECT_RULES.md §29). All responses are wrapped in the
 * standard envelope by ResponseInterceptor.
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Optional, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ErrorCode } from '@constructtrack/types';
import type { AppConfig } from '../../config/configuration';
import { DomainException } from '../../common/exceptions/domain.exception';
import { AuthService, type AuthResult } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleCodeService } from './google-code.service';
import { GoogleStrategy, type GooglePrincipal } from './google.strategy';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import {
  CurrentUser,
  CurrentTenant,
} from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleCodeService: GoogleCodeService,
    private readonly configService: ConfigService<AppConfig, true>,
    @Optional()
    @Inject(GoogleStrategy)
    private readonly googleStrategy: GoogleStrategy | null,
  ) {}

  /**
   * Extracts client metadata (user-agent, IP, correlation id) from the
   * request for session tracking and audit logging.
   */
  private extractMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress:
        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]
          ?.trim() ?? req.ip,
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? '',
    };
  }

  @Public()
  @RateLimit({ limit: 10, ttl: 60000 })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.register(dto, this.extractMeta(req));
  }

  @Public()
  @RateLimit({ limit: 10, ttl: 60000 })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResult> {
    return this.authService.login(dto, this.extractMeta(req));
  }

  /**
   * Google OAuth — step 1: redirect the browser to Google's consent screen.
   * The signed `state` carries the post-login path and blocks tampering.
   */
  @Public()
  @Get('google')
  async googleLogin(
    @Query('next') next: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const strategy = this.googleStrategy;
    if (!strategy) {
      throw new DomainException(
        ErrorCode.AUTH_GOOGLE_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Google sign-in is not configured on this server.',
      );
    }
    const state = this.authService.buildGoogleState(next);
    const url = strategy.authorizeURLForClient({
      scope: ['profile', 'email'],
      state,
      accessType: 'online',
    });
    res.redirect(url);
  }

  /**
   * Google OAuth — step 2 (redirected by Google): passport completes the
   * token exchange, then the browser is redirected back to the SPA with a
   * short-lived one-time code (never a token) + the original `next` path.
   */
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      res.redirect(this.authService.googleErrorRedirect('access_denied'));
      return;
    }
    const payload = this.authService.verifyGoogleState(state);
    if (!payload) {
      res.redirect(this.authService.googleErrorRedirect('invalid_state'));
      return;
    }
    const principal = req.user as GooglePrincipal;
    const code = this.googleCodeService.issue(
      principal.userId,
      principal.tenantId,
      principal.role,
    );
    const webUrl = this.configService.get<string>('webUrl', { infer: true });
    const redirect = `${webUrl.replace(/\/$/, '')}/auth/google/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(payload.next)}`;
    res.redirect(redirect);
  }

  /**
   * Google OAuth — step 3: the SPA exchanges its one-time code for a token
   * pair (same payload shape as login/register).
   */
  @Public()
  @RateLimit({ limit: 10, ttl: 60000 })
  @Post('google/exchange')
  @HttpCode(200)
  async googleExchange(
    @Body() dto: GoogleExchangeDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    const principal = this.googleCodeService.consume(dto.code);
    if (!principal) {
      throw new DomainException(
        ErrorCode.AUTH_GOOGLE_CODE_INVALID,
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired Google sign-in code. Please sign in again.',
      );
    }
    return this.authService.issueSessionForPrincipal(principal, this.extractMeta(req));
  }

  @Public()
  @RateLimit({ limit: 20, ttl: 60000 })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.refresh(dto, this.extractMeta(req));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.logout(
      user.userId,
      tenantId,
      dto.refreshToken,
      this.extractMeta(req),
    );
  }

  @Get('me')
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.authService.getMe(user.userId, tenantId);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, tenantId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    const storageKey = await this.authService.setAvatar(
      user.userId,
      avatar?.buffer,
      avatar?.mimetype,
    );
    return { data: { avatarUrl: storageKey ?? null } };
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.removeAvatar(user.userId);
  }

  /**
   * Serves an avatar image. Public on purpose — `<img>` tags cannot send
   * Authorization headers, and avatar URLs are unguessable (ObjectIds).
   */
  @Public()
  @Get(':userId/avatar')
  async getAvatar(@Param('userId') userId: string, @Res() res: Response) {
    const avatar = await this.authService.resolveAvatar(userId);
    if (!avatar) {
      res.status(HttpStatus.NOT_FOUND).send();
      return;
    }
    res.set({ 'Content-Type': avatar.mimeType, 'Cache-Control': 'private, max-age=86400' });
    return res.sendFile(avatar.absPath);
  }
}
