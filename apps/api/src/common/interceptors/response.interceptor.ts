/**
 * Response interceptor.
 *
 * Wraps every successful response in the standard success envelope:
 *   { data: T, meta: { requestId, timestamp, pagination? } }
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
import { Request, Response as ExpressResponse } from 'express';
import type { ApiResponse } from '@constructtrack/types';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<ExpressResponse>();

    return next.handle().pipe(
      map((data) => {
        const requestId =
          (request.headers['x-request-id'] as string | undefined) ??
          `res_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        return {
          data,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            // Pagination metadata, if present, is attached by the controller/service
            // via a well-known symbol on the response locals.
            pagination: this.extractPagination(response),
          },
        };
      }),
    );
  }

  private extractPagination(
    response: ExpressResponse,
  ): ApiResponse<unknown>['meta']['pagination'] {
    const pagination = (response.locals as { pagination?: ApiResponse<unknown>['meta']['pagination'] }).pagination;
    return pagination;
  }
}
