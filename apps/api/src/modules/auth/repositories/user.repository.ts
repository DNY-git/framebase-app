/**
 * User repository — data access for the User collection.
 *
 * Users are global (not tenant-scoped). A user may belong to multiple
 * tenants via memberships. Because users aren't tenant-scoped, this
 * repository does not extend BaseRepository (which injects tenantId on
 * every query). All queries are direct Mongoose queries.
 *
 * Services depend on this class via its public methods (PROJECT_RULES §34).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';

export interface UserDomain {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  name: string;
  status: string;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(@InjectModel(User.name) model: Model<UserDocument>) {
    this.model = model;
  }

  protected readonly model: Model<UserDocument>;

  async findById(id: string): Promise<UserDomain | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<UserDomain | null> {
    const doc = await this.model.findOne({ email }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserDomain | null> {
    const doc = await this.model.findOne({ googleId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash?: string;
    googleId?: string;
    avatarUrl?: string | null;
    status?: string;
  }): Promise<UserDomain> {
    const doc = await this.model.create({
      email: data.email,
      name: data.name,
      ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
      ...(data.googleId ? { googleId: data.googleId } : {}),
      ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
      status: data.status ?? 'active',
    });
    return this.toDomain(doc);
  }

  /** Links a Google account to an existing credentials user (same email). */
  async linkGoogleId(id: string, googleId: string): Promise<UserDomain | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        { $set: { googleId } },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.model
      .updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  async updateProfile(
    id: string,
    data: { name?: string; avatarUrl?: string | null },
  ): Promise<UserDomain | null> {
    const set: Record<string, unknown> = {};
    if (data.name !== undefined) set.name = data.name;
    // Only touch avatarUrl when explicitly provided — an unconditional
    // `?? null` here wiped the stored reference on every profile save.
    if (data.avatarUrl !== undefined) set.avatarUrl = data.avatarUrl;
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const doc = await this.model
      .findOne({ email })
      .select('_id')
      .lean()
      .exec();
    return doc !== null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.model
      .updateOne({ _id: id }, { $set: { passwordHash } })
      .exec();
  }

  /**
   * Finds multiple users by id — used to hydrate team member names/emails.
   */
  async findByIds(ids: string[]): Promise<UserDomain[]> {
    const docs = await this.model.find({ _id: { $in: ids } }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  protected toDomain(doc: UserDocument): UserDomain {
    return {
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash ?? null,
      googleId: doc.googleId ?? null,
      name: doc.name,
      status: doc.status,
      avatarUrl: doc.avatarUrl ?? null,
      lastLoginAt: doc.lastLoginAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
