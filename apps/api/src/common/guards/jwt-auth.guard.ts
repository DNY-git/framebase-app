/**
 * Global JWT authentication guard.
 *
 * Registered as APP_GUARD so every route is protected by default.
 * Routes marked @Public() are skipped. On a valid access token, the
 * authenticated user is attached to the request for downstream use.
 *
 * Per PROJECT_RULES.md §45: authentication is required by default.
 * Per docs/security/authentication.md: fail closed on identity doubt.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TokenService } from '../../modules/auth/token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../decorators/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() routes bypass authentication.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & {
      user?: AuthenticatedUser;
    }>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing or malformed access token.');
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      request.user = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        sessionId: '', // access token doesn't carry sessionId; refresh flow does
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  /**
   * Extracts the Bearer token from the Authorization header.
   * Returns null if the header is absent or malformed.
   */
  private extractToken(request: Request & {
    user?: AuthenticatedUser;
  }): string | null {
    const [type, token] =
      (request.headers['authorization'] as string | undefined)?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }
    return null;
  }
}
