import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitEntry {
  hits: number;
  windowStart: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

const CLEANUP_INTERVAL_MS = 60_000;
const MAX_ENTRY_AGE_MS = 300_000;

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  consume(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      this.store.set(key, { hits: 1, windowStart: now });
      return { allowed: true, remaining: limit - 1, reset: now + windowMs };
    }

    entry.hits += 1;
    if (entry.hits > limit) {
      return { allowed: false, remaining: 0, reset: entry.windowStart + windowMs };
    }

    return { allowed: true, remaining: limit - entry.hits, reset: entry.windowStart + windowMs };
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now - entry.windowStart >= MAX_ENTRY_AGE_MS) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale rate-limit entries`);
    }
  }
}
