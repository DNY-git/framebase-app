/**
 * Auth module — registration, login, token refresh, logout, profile.
 *
 * Registers the four Mongoose models auth needs (Tenant, User, Membership,
 * Session), the repositories that wrap them, the password + token services,
 * the auth service, and the controller. JwtModule is registered with
 * placeholder defaults — real signing secrets are applied per-token in
 * TokenService (which reads them from ConfigService).
 *
 * See docs/security/authentication.md, docs/api/authentication.md.
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Membership, MembershipSchema } from '../../schemas/membership.schema';
import { Session, SessionSchema } from '../../schemas/session.schema';
import type { AppConfig } from '../../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { GoogleStrategy } from './google.strategy';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleCodeService } from './google-code.service';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { SessionRepository } from './repositories/session.repository';

@Module({
  imports: [
    JwtModule.register({
      // Real secrets + TTLs are applied per-token in TokenService.
      secret: 'placeholder-resolved-per-token',
      signOptions: { expiresIn: '15m' },
    }),
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    GoogleCodeService,
    GoogleAuthGuard,
    {
      provide: GoogleStrategy,
      inject: [AuthService, ConfigService],
      useFactory: (
        authService: AuthService,
        configService: ConfigService<AppConfig, true>,
      ) => {
        const clientId = configService.get<string>('googleClientId', { infer: true });
        const clientSecret = configService.get<string>('googleClientSecret', { infer: true });
        const callbackUrl = configService.get<string>('googleCallbackUrl', { infer: true });

         // === TEMP GOOGLE OAUTH DIAGNOSTIC (safe: never prints the secret) ===
         try {
           // eslint-disable-next-line @typescript-eslint/no-require-imports
           const crypto = require('crypto');
           // eslint-disable-next-line @typescript-eslint/no-require-imports
           const fs = require('fs');
           // eslint-disable-next-line @typescript-eslint/no-require-imports
           const path = require('path');
          const fp = (s: string) => (s ? crypto.createHash('sha256').update(s).digest('hex').slice(0, 16) : 'EMPTY');
          const hasWS = (s: string) => /^\s|\s$/.test(s);
          const hasQuote = (s: string) => /['"]/.test(s);
          const runtimeSecret = clientSecret ?? '';
          const dotEnvPaths = [
            path.resolve(process.cwd(), '.env'),
            path.resolve(process.cwd(), 'apps/api/.env'),
            path.resolve(__dirname, '../../../.env'),
            path.resolve(__dirname, '../../.env'),
          ];
          // eslint-disable-next-line no-console
          console.error('[GOOGLE-DIAG] clientId        =', clientId);
          console.error('[GOOGLE-DIAG] callbackUrl     =', callbackUrl);
          console.error('[GOOGLE-DIAG] secret.length   =', runtimeSecret.length);
          console.error('[GOOGLE-DIAG] secret.fp       =', fp(runtimeSecret));
          console.error('[GOOGLE-DIAG] secret.hasWS    =', hasWS(runtimeSecret));
          console.error('[GOOGLE-DIAG] secret.hasQuote =', hasQuote(runtimeSecret));
          for (const p of dotEnvPaths) {
            try {
              const txt = fs.readFileSync(p, 'utf8');
              const line = txt.split('\n').find((l: string) => l.startsWith('GOOGLE_CLIENT_SECRET='));
              if (line) {
                const raw = line.slice('GOOGLE_CLIENT_SECRET='.length).trim();
                console.error(
                  `[GOOGLE-DIAG] .env[${p}] secret.fp=${fp(raw)} hasWS=${hasWS(raw)} hasQuote=${hasQuote(raw)} MATCHES_RUNTIME=${fp(raw) === fp(runtimeSecret)}`,
                );
              }
            } catch {
              /* file absent */
            }
          }
          console.error(
            '[GOOGLE-DIAG] -> GoogleStrategy({ clientID:', clientId, ', callbackURL:', callbackUrl, ', clientSecret.fp:', fp(runtimeSecret), '})',
          );
        } catch (diagErr) {
          console.error('[GOOGLE-DIAG] diagnostic error', diagErr);
        }
        // === END TEMP GOOGLE OAUTH DIAGNOSTIC ===

        if (!clientId || !clientSecret) {
          GoogleStrategy.configured = false;
          return null;
        }
        return new GoogleStrategy(
          authService,
          clientId,
          clientSecret,
          configService.get<string>('googleCallbackUrl', { infer: true }),
        );
      },
    },
    TenantRepository,
    UserRepository,
    MembershipRepository,
    SessionRepository,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
