/**
 * Health service — aggregates subsystem health checks.
 *
 * In Phase 1, the only subsystem is the database (MongoDB Atlas).
 * Future phases will add checks for Redis, AI providers, etc.
 *
 * The health endpoint must never throw and must always respond quickly,
 * even if subsystems are degraded. This is why DatabaseService.getStatus()
 * is synchronous and non-throwing.
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: string;
      error: string | null;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly version = '0.1.0';

  constructor(private readonly databaseService: DatabaseService) {}

  async check(): Promise<HealthCheckResult> {
    const dbStatus = this.databaseService.getStatus();

    const overall: HealthCheckResult['status'] =
      dbStatus.status === 'connected' ? 'ok' : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      version: this.version,
      checks: {
        database: dbStatus,
      },
    };
  }
}
