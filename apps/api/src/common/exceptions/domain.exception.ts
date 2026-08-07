import { HttpException } from '@nestjs/common';
import type { FieldError } from '@constructtrack/types';
import { ErrorCode } from '@constructtrack/types';

export class DomainException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    status: number,
    message: string,
    errors?: FieldError[],
  ) {
    const body: Record<string, unknown> = { errorCode, message };
    if (errors) { body.errors = errors; }
    super(body, status);
  }
}
