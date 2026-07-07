/**
 * Placeholder unit test for the health service.
 * Verifies that the health check returns the expected shape.
 * Real subsystem checks are added as features land.
 */
import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status when database is connected', async () => {
    const databaseService = {
      getStatus: vi.fn().mockReturnValue({ status: 'connected', error: null }),
    };
    const service = new HealthService(databaseService as never);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.checks.database.status).toBe('connected');
    expect(result.version).toBe('0.1.0');
    expect(result.timestamp).toBeTruthy();
  });

  it('returns degraded status when database is disconnected', async () => {
    const databaseService = {
      getStatus: vi.fn().mockReturnValue({ status: 'disconnected', error: null }),
    };
    const service = new HealthService(databaseService as never);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.database.status).toBe('disconnected');
  });
});
