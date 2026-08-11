/**
 * Public invitations controller — acceptance flow.
 *
 *   GET  /api/v1/invitations/:token         → invitation info (public)
 *   POST /api/v1/invitations/:token/accept  → accept (public; optional auth)
 *
 * The accept endpoint reads an optional Bearer token from the Authorization
 * header so an already-logged-in user can accept without re-authenticating.
 * Everything else is resolved against the cryptographically random
 * invitation token (dev flow — production email delivery is added later).
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { OrganizationsService, type RequestMeta } from './organizations.service';
import { TokenService } from '../auth/token.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import type { AuthContext } from '../../common/authorization/authorization.types';

@Public()
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly tokenService: TokenService,
  ) {}

  private extractMeta(req: Request): RequestMeta {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress:
        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]
          ?.trim() ?? req.ip,
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? '',
    };
  }

  /** Optional — parses a Bearer access token if one was sent. */
  private async optionalAuth(authorization: string | undefined): Promise<AuthContext | null> {
    if (!authorization) return null;
    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) return null;
    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      return {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
      };
    } catch {
      // An invalid token is treated as "not authenticated" — the accept
      // endpoint will respond with INVITATION_LOGIN_REQUIRED.
      return null;
    }
  }

  @Get(':token')
  async resolve(
    @Param('token') token: string,
  ) {
    const invitation = await this.organizationsService.resolveInvitation(token);
    return { data: invitation };
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
    @Headers('authorization') authorization: string | undefined,
    @Req() req: Request,
  ) {
    const auth = await this.optionalAuth(authorization);
    const result = await this.organizationsService.acceptInvitation(
      token,
      auth,
      dto,
      this.extractMeta(req),
    );
    return { data: result };
  }
}