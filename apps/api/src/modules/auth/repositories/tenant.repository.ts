/**
 * Tenant repository — data access for the Tenant collection.
 *
 * Tenants are the root organizational entity and are NOT tenant-scoped
 * (they are the tenant), so this repository does not extend BaseRepository.
 * All queries here are direct Mongoose queries scoped only by the
 * tenant's own attributes (slug, id, status).
 *
 * The repository interface (PROJECT_RULES §34) is still honored — services
 * depend on this class via its public methods, never on Mongoose directly.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../../../schemas/tenant.schema';

export interface TenantDomain {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TenantRepository {
  private readonly logger = new Logger(TenantRepository.name);

  constructor(@InjectModel(Tenant.name) model: Model<TenantDocument>) {
    this.model = model;
  }

  protected readonly model: Model<TenantDocument>;

  async findById(id: string): Promise<TenantDomain | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<TenantDomain | null> {
    const doc = await this.model.findOne({ slug }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(data: {
    name: string;
    slug: string;
    status?: string;
  }): Promise<TenantDomain> {
    const doc = await this.model.create({
      name: data.name,
      slug: data.slug,
      status: data.status ?? 'active',
    });
    return this.toDomain(doc);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const doc = await this.model
      .findOne({ slug })
      .select('_id')
      .lean()
      .exec();
    return doc !== null;
  }

  protected toDomain(doc: TenantDocument): TenantDomain {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
