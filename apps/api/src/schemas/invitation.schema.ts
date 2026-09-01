/**
 * Invitation schema — an email invitation to join an organization (tenant).
 *
 * An invitation is created by an organization owner/admin for a specific
 * email address and role. It carries a cryptographically random token that
 * acts as the acceptance credential (dev flow — production email delivery
 * can be layered on later; see prompt Phase 9 / Email).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Role } from '@constructtrack/types';

export type InvitationDocument = HydratedDocument<Invitation>;

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class Invitation {
  _id!: MongooseSchema.Types.ObjectId;

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
    trim: true,
    lowercase: true,
    index: true,
  })
  email!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(Role),
  })
  role!: Role;

  /** Cryptographically random, non-guessable acceptance token. */
  @Prop({ type: String, required: true, unique: true, index: true })
  token!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  /** null = unlimited, 1–50 = max accepts. */
  @Prop({ type: Number, default: null })
  usageLimit?: number | null;

  @Prop({ type: Number, default: 0 })
  usedCount!: number;

  /** The user who created the invitation. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  invitedBy!: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date })
  acceptedAt?: Date;

  /** The user who accepted the invitation. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  acceptedBy?: MongooseSchema.Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Organization + email lookups (used by the team invite flow).
InvitationSchema.index({ tenantId: 1, email: 1 });
// Expiry sweeps / active-invitation queries.
InvitationSchema.index({ status: 1, expiresAt: 1 });