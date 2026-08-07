import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-request-id'] as string) ??
      (req.headers['x-correlation-id'] as string) ??
      `ct_${randomUUID()}`;

    req.headers['x-request-id'] = correlationId;
    res.setHeader('x-request-id', correlationId);

    next();
  }
}
