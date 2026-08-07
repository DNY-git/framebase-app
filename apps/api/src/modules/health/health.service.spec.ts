import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status when database is connected', async () => {
    const databaseService = {
      getStatus: vi.fn().mockReturnValue({ status: 'connected', error: null }),
      ping: vi.fn().mockResolvedValue(true),
    };
    const metricsService = {
      snapshot: vi.fn().mockReturnValue({ uptimeSeconds: 123, totalRequests: 10, totalErrors: 0, endpoints: [] }),
    };
    const service = new HealthService(databaseService as never, metricsService as never);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.checks.database.status).toBe('connected');
    expect(result.checks.metrics.totalRequests).toBe(10);
    expect(result.version).toBe('0.1.0');
    expect(result.timestamp).toBeTruthy();
  });

  it('returns degraded status when database is disconnected', async () => {
    const databaseService = {
      getStatus: vi.fn().mockReturnValue({ status: 'disconnected', error: null }),
      ping: vi.fn(),
    };
    const metricsService = {
      snapshot: vi.fn().mockReturnValue({ uptimeSeconds: 0, totalRequests: 0, totalErrors: 0, endpoints: [] }),
    };
    const service = new HealthService(databaseService as never, metricsService as never);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.database.status).toBe('disconnected');
    expect(result.checks.metrics.totalRequests).toBe(0);
  });

  it('returns degraded status when ping fails', async () => {
    const databaseService = {
      getStatus: vi.fn().mockReturnValue({ status: 'connected', error: null }),
      ping: vi.fn().mockResolvedValue(false),
    };
    const metricsService = {
      snapshot: vi.fn().mockReturnValue({ uptimeSeconds: 0, totalRequests: 0, totalErrors: 0, endpoints: [] }),
    };
    const service = new HealthService(databaseService as never, metricsService as never);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.database.error).toBe('Ping failed');
  });
});
