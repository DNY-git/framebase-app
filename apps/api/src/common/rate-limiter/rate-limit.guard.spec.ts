import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from './rate-limiter.service';
import type { AppConfig } from '../../config/configuration';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let rateLimiter: RateLimiterService;
  let configService: ConfigService;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;

    rateLimiter = {
      consume: vi.fn().mockReturnValue({ allowed: true, remaining: 99, reset: Date.now() + 60_000 }),
    } as unknown as RateLimiterService;

    configService = {
      get: vi.fn((key: string, defaultValue: number) => defaultValue),
    } as unknown as ConfigService;

    guard = new RateLimitGuard(reflector, rateLimiter, configService as unknown as ConfigService<AppConfig>);
  });

  const createMockContext = (user?: { userId?: string }, ip?: string): ExecutionContext =>
    ({
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user,
          ip,
          socket: { remoteAddress: '127.0.0.1' },
        }),
      }),
    } as unknown as ExecutionContext);

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request when within limit', () => {
    const context = createMockContext({ userId: 'user-1' });
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    vi.spyOn(rateLimiter, 'consume').mockReturnValue({ allowed: true, remaining: 49, reset: Date.now() + 60_000 });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw 429 when rate limited', () => {
    const context = createMockContext({ userId: 'user-1' });
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    vi.spyOn(rateLimiter, 'consume').mockReturnValue({ allowed: false, remaining: 0, reset: Date.now() + 60_000 });

    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try {
      guard.canActivate(context);
    } catch (e: unknown) {
      expect((e as HttpException).getStatus()).toBe(429);
    }
  });

  it('should use authenticated config for logged-in users', () => {
    const context = createMockContext({ userId: 'user-1' });
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    guard.canActivate(context);

    expect(rateLimiter.consume).toHaveBeenCalledWith('user:user-1', 100, 60000);
  });

  it('should use public config for anonymous requests', () => {
    const context = createMockContext(undefined, '10.0.0.1');
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    guard.canActivate(context);

    expect(rateLimiter.consume).toHaveBeenCalledWith('ip:10.0.0.1', 20, 60000);
  });

  it('should use decorator override when present', () => {
    const context = createMockContext({ userId: 'user-1' });
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 5, ttl: 10_000 });

    guard.canActivate(context);

    expect(rateLimiter.consume).toHaveBeenCalledWith('user:user-1', 5, 10000);
  });
});
