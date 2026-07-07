/**
 * Tenant schema — the root organizational entity.
 *
 * Every other tenant-scoped document references a tenant via `tenantId`.
 * Tenancy is the foundation of multi-tenant isolation. See
 * docs/database/security.md and ADR-002.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class Tenant {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  slug!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(TenantStatus),
    default: TenantStatus.ACTIVE,
  })
  status!: TenantStatus;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
