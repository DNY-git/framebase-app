/**
 * Organizations module — organization lifecycle, team management, and
 * invitation flow (MongoDB/Mongoose — no Prisma, no PostgreSQL).
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Membership, MembershipSchema } from '../../schemas/membership.schema';
import { Session, SessionSchema } from '../../schemas/session.schema';
import { Invitation, InvitationSchema } from '../../schemas/invitation.schema';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { InvitationsController } from './invitations.controller';
import { InvitationRepository } from './repositories/invitation.repository';
import { TenantRepository } from '../auth/repositories/tenant.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { MembershipRepository } from '../auth/repositories/membership.repository';
import { SessionRepository } from '../auth/repositories/session.repository';
import { TokenService } from '../auth/token.service';
import { PasswordService } from '../auth/password.service';
import { AuditModule } from '../audit/audit.module';
import { MailerModule } from '../../common/mailer/mailer.module';

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
      { name: Invitation.name, schema: InvitationSchema },
    ]),
    AuditModule,
    MailerModule,
  ],
  controllers: [OrganizationsController, InvitationsController],
  providers: [
    OrganizationsService,
    InvitationRepository,
    TenantRepository,
    UserRepository,
    MembershipRepository,
    SessionRepository,
    TokenService,
    PasswordService,
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}