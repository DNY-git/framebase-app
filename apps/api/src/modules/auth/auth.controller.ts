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
 *
 * Controllers stay thin — they translate HTTP ↔ domain and delegate to
 * AuthService (PROJECT_RULES.md §29). All responses are wrapped in the
 * standard envelope by ResponseInterceptor.
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService, type AuthResult } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import {
  CurrentUser,
  CurrentTenant,
} from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';

@Controller('auth')
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
      limits: { fileSize: 2 * 1024 * 1024 },
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
