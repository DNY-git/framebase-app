/**
 * Audit log schema — records every stateful mutation.
 *
 * Every mutating operation (create, update, delete) on tenant-scoped data
 * writes an audit-log entry. The entry captures who did what, to which
 * entity, and the before/after state. This satisfies PROJECT_RULES.md §5
 * ("All mutating operations are auditable") and supports compliance.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  })
  tenantId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  actorId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  @Prop({ type: String, required: true })
  entityType!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  entityId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed })
  before?: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  after?: Record<string, unknown>;

  @Prop({ type: String, index: true })
  correlationId?: string;

  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Optimize queries by (tenantId, entityType, createdAt) — common audit lookups.
AuditLogSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
