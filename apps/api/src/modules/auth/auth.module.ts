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
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from '../../schemas/password-reset-token.schema';
import { MailerModule } from '../../common/mailer/mailer.module';
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
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';

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
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    MailerModule,
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

        if (!clientId || !clientSecret) {
          GoogleStrategy.configured = false;
          return null;
        }
        return new GoogleStrategy(
          authService,
          clientId,
          clientSecret,
          callbackUrl,
        );
      },
    },
    TenantRepository,
    UserRepository,
    MembershipRepository,
    SessionRepository,
    PasswordResetTokenRepository,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
