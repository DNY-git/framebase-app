import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('starts with zero counters', () => {
    const snapshot = service.snapshot();
    expect(snapshot.totalRequests).toBe(0);
    expect(snapshot.totalErrors).toBe(0);
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('records a request and increments counters', () => {
    service.record('GET', '/api/v1/health', 200, 10);
    const snapshot = service.snapshot();
    expect(snapshot.totalRequests).toBe(1);
    expect(snapshot.totalErrors).toBe(0);
  });

  it('records errors separately', () => {
    service.record('POST', '/api/v1/projects', 500, 50);
    const snapshot = service.snapshot();
    expect(snapshot.totalRequests).toBe(1);
    expect(snapshot.totalErrors).toBe(1);
  });

  it('aggregates multiple requests to same endpoint', () => {
    service.record('GET', '/api/v1/equipment', 200, 10);
    service.record('GET', '/api/v1/equipment', 200, 20);
    const snapshot = service.snapshot();
    expect(snapshot.totalRequests).toBe(2);
    expect((snapshot.endpoints as Array<Record<string, unknown>>)[0].avgMs).toBe(15);
    expect((snapshot.endpoints as Array<Record<string, unknown>>)[0].maxMs).toBe(20);
  });

  it('normalizes paths with ObjectId-like segments', () => {
    service.record('GET', '/api/v1/equipment/507f1f77bcf86cd799439011', 200, 5);
    const snapshot = service.snapshot();
    expect((snapshot.endpoints as Array<Record<string, unknown>>)[0].endpoint).toBe('GET:/api/v1/equipment/:id');
  });

  it('reset clears all counters', () => {
    service.record('GET', '/api/v1/test', 200, 5);
    service.reset();
    const snapshot = service.snapshot();
    expect(snapshot.totalRequests).toBe(0);
    expect(snapshot.endpoints).toHaveLength(0);
  });
});
