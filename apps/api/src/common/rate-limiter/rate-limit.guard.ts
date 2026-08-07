import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@constructtrack/types';
import type { Request } from 'express';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator';
import { RateLimiterService } from './rate-limiter.service';
import type { AppConfig } from '../../config/configuration';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly defaultAuthLimit: number;
  private readonly defaultAuthTtl: number;
  private readonly defaultPublicLimit: number;
  private readonly defaultPublicTtl: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
    configService: ConfigService<AppConfig>,
  ) {
    this.defaultAuthLimit = configService.get<number>('rateLimitAuthLimit', 100);
    this.defaultAuthTtl = configService.get<number>('rateLimitAuthTtl', 60000);
    this.defaultPublicLimit = configService.get<number>('rateLimitPublicLimit', 20);
    this.defaultPublicTtl = configService.get<number>('rateLimitPublicTtl', 60000);
  }

  canActivate(context: ExecutionContext): boolean {
    const override = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<Request & { user?: { userId?: string } }>();
    const userId = request.user?.userId;
    const isAuthenticated = !!userId;

    const limit = override?.limit ?? (isAuthenticated ? this.defaultAuthLimit : this.defaultPublicLimit);
    const ttl = override?.ttl ?? (isAuthenticated ? this.defaultAuthTtl : this.defaultPublicTtl);

    const key = isAuthenticated ? `user:${userId}` : `ip:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;

    const result = this.rateLimiter.consume(key, limit, ttl);

    if (!result.allowed) {
      throw new HttpException(
        {
          errorCode: ErrorCode.RATE_LIMITED,
          message: 'Too many requests. Please try again later.',
        },
        429,
      );
    }

    return true;
  }
}
