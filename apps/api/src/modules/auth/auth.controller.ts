/**
 * Auth controller — HTTP endpoints for authentication.
 *
 *   POST /api/v1/auth/register   (public)  → 201 + token pair
 *   POST /api/v1/auth/login      (public)  → 200 + token pair
 *   POST /api/v1/auth/refresh    (public)  → 200 + new token pair
 *   POST /api/v1/auth/logout     (authed)  → 204
 *   GET  /api/v1/auth/me         (authed)  → 200 + profile
 *
 * Controllers stay thin — they translate HTTP ↔ domain and delegate to
 * AuthService (PROJECT_RULES.md §29). All responses are wrapped in the
 * standard envelope by ResponseInterceptor.
 */
import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthResult } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  CurrentTenant,
} from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.register(dto, this.extractMeta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResult> {
    return this.authService.login(dto, this.extractMeta(req));
  }

  @Public()
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
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.logout(
      user.userId,
      user.sessionId,
      tenantId,
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
}
