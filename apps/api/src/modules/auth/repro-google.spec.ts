/**
 * Reproduction harness for the Google OAuth 500 INTERNAL_ERROR.
 *
 * Uses a REAL in-memory MongoDB (not mocks) + the REAL schemas and repository
 * classes, but skips Nest DI (which has a ConfigService-resolution quirk here).
 * Exercises the exact post-exchange code path:
 *   AuthService.googleLogin(new Google profile)  -> GooglePrincipal
 *   AuthService.issueSessionForPrincipal(principal) -> AuthResult (token pair)
 * Any non-DomainException here is the real root cause behind INTERNAL_ERROR.
 */
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';

import {
  User,
  UserSchema,
  UserDocument,
} from '../../schemas/user.schema';
import {
  Tenant,
  TenantSchema,
  TenantDocument,
} from '../../schemas/tenant.schema';
import {
  Membership,
  MembershipSchema,
  MembershipDocument,
} from '../../schemas/membership.schema';
import {
  Session,
  SessionSchema,
  SessionDocument,
} from '../../schemas/session.schema';
import {
  AuditLog,
  AuditLogSchema,
  AuditLogDocument,
} from '../../schemas/audit-log.schema';
import { Role } from '@constructtrack/types';

import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { SessionRepository } from './repositories/session.repository';

describe('Google OAuth 500 reproduction', () => {
  let mongo: MongoMemoryServer;
  let auth: AuthService;
  let userRepo: UserRepository;
  let tenantRepo: TenantRepository;
  let membershipRepo: MembershipRepository;

  beforeAll(async () => {
    const atlasUri = process.env.MONGODB_URI;
    if (atlasUri) {
      console.log('[REPRO] using REAL MONGODB_URI (Atlas)');
      await mongoose.connect(atlasUri);
    } else {
      let lastErr: unknown;
      for (let i = 0; i < 3; i++) {
        try {
          mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!mongo) throw lastErr;
      await mongoose.connect(mongo.getUri());
    }

    const userModel = mongoose.model(User.name, UserSchema) as unknown as Model<UserDocument>;
    const tenantModel = mongoose.model(Tenant.name, TenantSchema) as unknown as Model<TenantDocument>;
    const membershipModel = mongoose.model(Membership.name, MembershipSchema) as unknown as Model<MembershipDocument>;
    const sessionModel = mongoose.model(Session.name, SessionSchema) as unknown as Model<SessionDocument>;
    const auditModel = mongoose.model(AuditLog.name, AuditLogSchema) as unknown as Model<AuditLogDocument>;

    await Promise.all([
      userModel.createIndexes(),
      tenantModel.createIndexes(),
      membershipModel.createIndexes(),
      sessionModel.createIndexes(),
    ]);

    const config: Record<string, string> = {
      jwtAccessSecret: 'test-access-secret',
      jwtRefreshSecret: 'test-refresh-secret',
      jwtAccessTtl: '15m',
      jwtRefreshTtl: '7d',
      appUrl: 'http://localhost:5173',
      passwordPepper: 'test-pepper',
      bcryptRounds: '10',
    };
    const configService = { get: (k: string) => config[k] ?? '' } as unknown as ConfigService<AppConfig, true>;

    tenantRepo = new TenantRepository(tenantModel);
    userRepo = new UserRepository(userModel);
    membershipRepo = new MembershipRepository(membershipModel);
    const sessionRepo = new SessionRepository(sessionModel);
    const auditService = new AuditService(auditModel);
    const passwordService = new PasswordService(configService);
    const tokenService = new TokenService(new JwtService({}), configService);

    auth = new AuthService(
      passwordService,
      tokenService,
      tenantRepo,
      userRepo,
      membershipRepo,
      sessionRepo,
      auditService,
      configService,
    );
  }, 600000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  it('reproduces the post-exchange failure for a NEW Google user', async () => {
    const profile = {
      googleId: 'repro-google-id-1',
      email: 'new.google.user@example.com',
      emailVerified: true,
      name: 'New Google User',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar.png',
    };

    try {
      const principal = await auth.googleLogin(profile, { correlationId: 'repro' });
      console.log('[REPRO] googleLogin principal:', JSON.stringify(principal));

      const result = await auth.issueSessionForPrincipal(principal, { correlationId: 'repro' });
      console.log('[REPRO] issueSessionForPrincipal OK — tokens issued.');
      expect(result.accessToken).toBeTruthy();
    } catch (err) {
      console.error('\n[REPRO] *** ACTUAL EXCEPTION THROWN (new user) ***');
      console.error(err instanceof Error ? err.stack : err);
      throw new Error(
        `Google OAuth post-exchange threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  it('exercises the LINKING branch (Google email already a credentials account)', async () => {
    // Pre-create a credentials user WITH a tenant + membership (like register()).
    const tenant = await tenantRepo.create({ name: 'Link Org', slug: 'link-org-repro' });
    const credsUser = await userRepo.create({
      email: 'link.me@example.com',
      name: 'Existing Creds User',
      passwordHash: 'hashed',
    });
    await membershipRepo.create({
      userId: credsUser.id,
      tenantId: tenant.id,
      role: Role.OWNER,
    });

    const profile = {
      googleId: 'repro-google-id-2',
      email: 'link.me@example.com',
      emailVerified: true,
      name: 'Existing Creds User',
      avatarUrl: null,
    };

    try {
      const principal = await auth.googleLogin(profile, { correlationId: 'repro-link' });
      console.log('[REPRO] link principal:', JSON.stringify(principal));
      const result = await auth.issueSessionForPrincipal(principal, { correlationId: 'repro-link' });
      console.log('[REPRO] link issueSessionForPrincipal OK.');
      expect(result.accessToken).toBeTruthy();
    } catch (err) {
      console.error('\n[REPRO] *** ACTUAL EXCEPTION THROWN (linking) ***');
      console.error(err instanceof Error ? err.stack : err);
      throw new Error(
        `Google OAuth linking threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  it('exercises edge-case Google profile data', async () => {
    const profile = {
      googleId: 'repro-google-id-3',
      email: 'edge.case.user@example.com',
      emailVerified: false,
      name: 'José Ñoño "Weird" Name—Long–Hyphen✓',
      avatarUrl: null,
    };

    try {
      const principal = await auth.googleLogin(profile, { correlationId: 'repro-edge' });
      console.log('[REPRO] edge principal:', JSON.stringify(principal));
      const result = await auth.issueSessionForPrincipal(principal, { correlationId: 'repro-edge' });
      console.log('[REPRO] edge issueSessionForPrincipal OK.');
      expect(result.accessToken).toBeTruthy();
    } catch (err) {
      console.error('\n[REPRO] *** ACTUAL EXCEPTION THROWN (edge) ***');
      console.error(err instanceof Error ? err.stack : err);
      throw new Error(
        `Google OAuth edge-case threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
});
