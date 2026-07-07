/**
 * Global exception filter.
 *
 * Maps every unhandled exception (domain errors, validation errors, and
 * unexpected crashes) to the standard error envelope defined in
 * docs/api/standards.md. Ensures clients always receive a consistent,
 * machine-readable error shape.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import type { ApiError, FieldError } from '@constructtrack/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.extractRequestId(request);
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let errorCode: string;
    let message: string;
    let errors: FieldError[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        errorCode = this.errorCodeFromStatus(statusCode);
        message = responseBody;
      } else if (this.isValidationResponse(responseBody)) {
        // class-validator response shape
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation failed';
        errors = this.normalizeValidationErrors(responseBody.message);
        statusCode = HttpStatus.BAD_REQUEST;
      } else if (this.isErrorEnvelope(responseBody)) {
        errorCode = responseBody.errorCode ?? this.errorCodeFromStatus(statusCode);
        message = responseBody.message;
        errors = responseBody.errors;
      } else {
        errorCode = this.errorCodeFromStatus(statusCode);
        message = exception.message;
      }
    } else {
      // Unexpected error — log full details, return generic message to client.
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred.';
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const errorEnvelope: ApiError = {
      statusCode,
      errorCode,
      message,
      errors,
      requestId,
      timestamp,
    };

    httpAdapter.reply(response, errorEnvelope, statusCode);
  }

  private extractRequestId(request: Request): string {
    const header = request.headers['x-request-id'];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }
    // Fall back to a generated ID for responses without an inbound correlation header.
    return `res_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private errorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private isValidationResponse(body: unknown): body is { message: unknown[] } {
    return (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      Array.isArray((body as { message: unknown }).message)
    );
  }

  private isErrorEnvelope(
    body: unknown,
  ): body is { errorCode?: string; message: string; errors?: FieldError[] } {
    return (
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { message?: unknown }).message === 'string'
    );
  }

  private normalizeValidationErrors(messages: unknown[]): FieldError[] {
    return messages.map((msg) => {
      const text = typeof msg === 'string' ? msg : String(msg);
      // class-validator messages often look like "property must be a string"
      const field = text.split(' ')[0]?.replace(/['"]/g, '') ?? 'unknown';
      return {
        field,
        constraint: 'INVALID',
        message: text,
      };
    });
  }
}
