import { Injectable } from '@nestjs/common';

interface MetricBucket {
  count: number;
  totalMs: number;
  maxMs: number;
  errorCount: number;
}

@Injectable()
export class MetricsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private startTime = Date.now();
  private readonly buckets = new Map<string, MetricBucket>();

  record(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.totalRequests++;
    if (statusCode >= 500) this.totalErrors++;

    const key = `${method}:${this.normalizePath(path)}`;
    const bucket = this.buckets.get(key) ?? { count: 0, totalMs: 0, maxMs: 0, errorCount: 0 };
    bucket.count++;
    bucket.totalMs += durationMs;
    bucket.maxMs = Math.max(bucket.maxMs, durationMs);
    if (statusCode >= 500) bucket.errorCount++;
    this.buckets.set(key, bucket);
  }

  snapshot(): Record<string, unknown> {
    const uptimeMs = Date.now() - this.startTime;
    const endpoints: Array<Record<string, unknown>> = [];
    for (const [key, bucket] of this.buckets) {
      endpoints.push({
        endpoint: key,
        count: bucket.count,
        avgMs: Math.round(bucket.totalMs / bucket.count),
        maxMs: bucket.maxMs,
        errorCount: bucket.errorCount,
      });
    }
    endpoints.sort((a, b) => (b.count as number) - (a.count as number));

    return {
      uptimeSeconds: Math.floor(uptimeMs / 1000),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      endpoints,
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
    this.buckets.clear();
  }

  private normalizePath(path: string): string {
    return path.replace(/\/[a-f0-9]{24}/gi, '/:id').replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
  }
}
