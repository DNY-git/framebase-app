import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new RateLimiterService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow first request', () => {
    const result = service.consume('test-key', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should allow requests within the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = service.consume('test-key', 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    for (let i = 0; i < 5; i++) {
      service.consume('test-key', 5, 60_000);
    }
    const result = service.consume('test-key', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should allow independent keys', () => {
    const limit = 3;
    for (let i = 0; i < limit; i++) {
      service.consume('key-a', limit, 60_000);
    }
    const resultA = service.consume('key-a', limit, 60_000);
    expect(resultA.allowed).toBe(false);

    const resultB = service.consume('key-b', limit, 60_000);
    expect(resultB.allowed).toBe(true);
  });

  it('should reset the window after TTL expires', () => {
    const limit = 2;
    service.consume('test-key', limit, 60_000);
    service.consume('test-key', limit, 60_000);
    expect(service.consume('test-key', limit, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    const result = service.consume('test-key', limit, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});
