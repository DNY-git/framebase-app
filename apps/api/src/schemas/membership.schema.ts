/**
 * Membership schema — links a user to a tenant with a role.
 *
 * This is the join entity for the user↔tenant relationship. A unique compound
 * index on (userId, tenantId) enforces that a user has exactly one role per
 * tenant. Roles are defined in @constructtrack/types (Role enum).
 *
 * Tenant isolation note: memberships are themselves tenant-scoped. A user's
 * memberships outside the current tenant context are never queryable.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Role } from '@constructtrack/types';

export type MembershipDocument = HydratedDocument<Membership>;

@Schema({ timestamps: true })
export class Membership {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  })
  tenantId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(Role),
  })
  role!: Role;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Enforce one role per (user, tenant) pair.
MembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
