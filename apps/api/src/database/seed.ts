/**
 * Seed script — initializes MongoDB Atlas with baseline dev data.
 *
 * Creates:
 *  - A default tenant ("ConstructTrack Demo")
 *  - An admin user (admin@constructtrack.local / ChangeMe123!)
 *  - A membership linking the admin to the tenant with the ADMIN role
 *
 * Idempotent: safe to run multiple times. Existing entities are left alone.
 *
 * Run via: npm run seed
 * Requires MONGODB_URI to point to a reachable MongoDB Atlas cluster.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Model, connection } from 'mongoose';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { configuration, AppConfig } from '../config/configuration';
import { Tenant, TenantSchema, TenantStatus } from '../schemas/tenant.schema';
import { User, UserSchema, UserStatus } from '../schemas/user.schema';
import { Membership, MembershipSchema } from '../schemas/membership.schema';
import { Role } from '@constructtrack/types';

const SEED_TENANT_SLUG = 'constructtrack-demo';
const SEED_ADMIN_EMAIL = 'admin@constructtrack.local';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => ({
        uri: config.get<string>('mongodbUri', { infer: true }) ?? '',
      }),
    }),
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
})
class SeedModule {}

async function seed(): Promise<void> {
  const app = await NestFactory.create(SeedModule, { logger: ['log', 'error', 'warn'] });
  const config = app.get(ConfigService<AppConfig>);

  const uri = config.get<string>('mongodbUri', { infer: true });
  if (!uri) {
    console.error(
      'MONGODB_URI is not configured. Set it in .env to a MongoDB Atlas connection string.',
    );
    process.exitCode = 1;
    return;
  }

  const tenantModel = app.get<Model<Tenant>>(`${Tenant.name}Model`);
  const userModel = app.get<Model<User>>(`${User.name}Model`);
  const membershipModel = app.get<Model<Membership>>(`${Membership.name}Model`);

  // Tenant
  let tenant = await tenantModel.findOne({ slug: SEED_TENANT_SLUG }).exec();
  if (tenant) {
    console.log(`Tenant "${SEED_TENANT_SLUG}" already exists — skipping.`);
  } else {
    tenant = await tenantModel.create({
      name: 'ConstructTrack Demo',
      slug: SEED_TENANT_SLUG,
      status: TenantStatus.ACTIVE,
    });
    console.log(`Created tenant "${tenant.name}" (id: ${tenant._id}).`);
  }

  // Admin user — hash the seed password with pepper, just like real auth.
  const pepper = config.get<string>('passwordPepper', { infer: true });
  const rounds = config.get<number>('bcryptRounds', { infer: true });
  const seedPassword = 'ChangeMe123!';
  const peppered = `${seedPassword}:${pepper}`;
  const passwordHash = await bcrypt.hash(peppered, rounds);

  let admin = await userModel.findOne({ email: SEED_ADMIN_EMAIL }).exec();
  if (admin) {
    console.log(`Admin user "${SEED_ADMIN_EMAIL}" already exists — skipping.`);
  } else {
    admin = await userModel.create({
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      name: 'Demo Admin',
      status: UserStatus.ACTIVE,
    });
    console.log(
      `Created admin user "${admin.email}" (id: ${admin._id}). Login: ${SEED_ADMIN_EMAIL} / ${seedPassword}`,
    );
  }

  // Membership
  const membership = await membershipModel
    .findOne({ userId: admin._id, tenantId: tenant._id })
    .exec();
  if (membership) {
    console.log('Admin membership already exists — skipping.');
  } else {
    await membershipModel.create({
      userId: admin._id,
      tenantId: tenant._id,
      role: Role.OWNER,
    });
    console.log(`Linked admin to tenant with role "${Role.OWNER}".`);
  }

  await connection.close();
  console.log('Seed complete.');
}

void seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
