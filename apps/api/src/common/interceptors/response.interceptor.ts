/**
 * Response interceptor.
 *
 * Wraps every successful response in the standard success envelope:
 *   { data: T, meta: { requestId, timestamp } }
 *
 * If the controller already returns an object with a `data` property
 * (the standard envelope shape), the interceptor passes it through and
 * only attaches requestId/timestamp to avoid double-wrapping.
 *
 * See docs/api/standards.md for the envelope specification.
 * The health-check endpoint is excluded — it returns its own shape.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import type { ApiResponse } from '@constructtrack/types';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        const requestId =
          (request.headers['x-request-id'] as string | undefined) ??
          `res_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        const timestamp = new Date().toISOString();

        // If the controller already returned an envelope shape
        // ({ data: ..., meta?: { ... } }), pass it through with our
        // metadata merged in, instead of double-wrapping.
        if (
          data !== null &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          'data' in data
        ) {
          const existingMeta =
            typeof (data as Record<string, unknown>).meta === 'object' &&
            (data as Record<string, unknown>).meta !== null
              ? (data as Record<string, unknown>).meta as Record<string, unknown>
              : {};
          return {
            data: (data as { data: T }).data,
            meta: {
              ...existingMeta,
              requestId,
              timestamp,
            },
          } as ApiResponse<T>;
        }

        return {
          data,
          meta: {
            requestId,
            timestamp,
          },
        } as ApiResponse<T>;
      }),
    );
  }
}
