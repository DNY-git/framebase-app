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
  passwordHash: string;
  name: string;
  status: string;
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

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    status?: string;
  }): Promise<UserDomain> {
    const doc = await this.model.create({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      status: data.status ?? 'active',
    });
    return this.toDomain(doc);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.model
      .updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const doc = await this.model
      .findOne({ email })
      .select('_id')
      .lean()
      .exec();
    return doc !== null;
  }

  protected toDomain(doc: UserDocument): UserDomain {
    return {
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      status: doc.status,
      lastLoginAt: doc.lastLoginAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
