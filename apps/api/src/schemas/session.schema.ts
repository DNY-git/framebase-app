/**
 * Session schema — tracks refresh tokens for session management.
 *
 * A session is created on login and invalidated on logout or token rotation.
 * Sessions enable revocation of active sessions (e.g., on password change)
 * and audit of login history. JWTs are stateless for access tokens; refresh
 * tokens are tracked here so they can be revoked.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Session {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  refreshTokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  ipAddress?: string;

  createdAt!: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// TTL index — Mongoose auto-expires sessions past their expiry.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup of a user's active sessions.
SessionSchema.index({ userId: 1, isActive: 1 });
