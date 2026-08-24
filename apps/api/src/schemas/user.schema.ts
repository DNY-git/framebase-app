/**
 * User schema — a platform user, scoped to one or more tenants via memberships.
 *
 * Users authenticate either with email/password (password stored as a bcrypt
 * hash, peppered — see docs/security/authentication.md) or with Google OAuth
 * (googleId set, no password). A user's role within a tenant is recorded in
 * the Membership document, not here, because a user may belong to multiple
 * tenants with different roles.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Schema({ timestamps: true })
export class User {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  email!: string;

  /**
   * Bcrypt hash — present only for password (credentials) users.
   * Google-authenticated users have no password and must use Google.
   */
  @Prop({ type: String })
  passwordHash?: string;

  /** Google OAuth subject id — set for accounts created via Google. */
  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
