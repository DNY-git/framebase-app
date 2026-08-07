import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  it('generates a correlation ID when none is provided', () => {
    const req = { headers: {} } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    const middleware = new CorrelationIdMiddleware();
    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBeTruthy();
    expect((req.headers['x-request-id'] as string).startsWith('ct_')).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.headers['x-request-id']);
    expect(next).toHaveBeenCalledOnce();
  });

  it('forwards an existing x-request-id header', () => {
    const req = { headers: { 'x-request-id': 'existing-id' } } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    const middleware = new CorrelationIdMiddleware();
    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBe('existing-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'existing-id');
  });
});
