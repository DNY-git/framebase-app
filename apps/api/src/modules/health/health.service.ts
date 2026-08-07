import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MetricsService } from '../metrics/metrics.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: string;
      error: string | null;
      pingMs?: number;
    };
    metrics: {
      uptimeSeconds: number;
      totalRequests: number;
      totalErrors: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly version = '0.1.0';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly metricsService: MetricsService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const dbStatus = this.databaseService.getStatus();
    const metrics = this.metricsService.snapshot();

    let dbDisplayStatus: string = dbStatus.status;
    let dbError: string | null = dbStatus.error;
    let pingMs: number | undefined;

    if (dbStatus.status === 'connected') {
      const pingStart = Date.now();
      const pingOk = await this.databaseService.ping();
      pingMs = Date.now() - pingStart;
      if (!pingOk) {
        dbDisplayStatus = 'degraded';
        dbError = 'Ping failed';
      }
    }

    const overall: HealthCheckResult['status'] =
      dbDisplayStatus === 'connected' ? 'ok' : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      version: this.version,
      checks: {
        database: { status: dbDisplayStatus, error: dbError, pingMs },
        metrics: {
          uptimeSeconds: metrics.uptimeSeconds as number,
          totalRequests: metrics.totalRequests as number,
          totalErrors: metrics.totalErrors as number,
        },
      },
    };
  }
}
