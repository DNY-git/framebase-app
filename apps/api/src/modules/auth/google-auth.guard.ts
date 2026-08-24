/**
 * GoogleAuthGuard — passport 'google' guard with a friendly failure mode.
 *
 * When Google OAuth env vars are absent the strategy provider resolves to
 * null; passport would throw "Unknown authentication strategy" on use, so
 * this guard answers 503 AUTH_GOOGLE_NOT_CONFIGURED instead.
 */
import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { GoogleStrategy } from './google.strategy';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    if (!GoogleStrategy.configured) {
      throw new DomainException(
        ErrorCode.AUTH_GOOGLE_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Google sign-in is not configured on this server.',
      );
    }
    return super.canActivate(context);
  }
}