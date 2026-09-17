/**
 * Password reset token schema — single-use, time-limited token for
 * resetting a user's password via email.
 *
 * Tokens are stored hashed (SHA-256) — the raw token is only ever sent
 * to the user via email, never stored. Follows the same pattern used
 * for invitation tokens.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

export enum PasswordResetTokenStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class PasswordResetToken {
  _id!: MongooseSchema.Types.ObjectId;

  /** The user this token belongs to. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  /** SHA-256 hash of the cryptographically random token. */
  @Prop({ type: String, required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PasswordResetTokenStatus),
    default: PasswordResetTokenStatus.PENDING,
  })
  status!: PasswordResetTokenStatus;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

// Expiry sweeps / active-token queries.
PasswordResetTokenSchema.index({ status: 1, expiresAt: 1 });
// Lookup by user (e.g. invalidate all pending tokens on password change).
PasswordResetTokenSchema.index({ userId: 1, status: 1 });
