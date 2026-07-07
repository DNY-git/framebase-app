/**
 * Abstract base repository implementing IBaseRepository<T> with Mongoose.
 *
 * Concrete domain repositories extend this class, passing their Mongoose
 * model. Tenant scoping is automatic — every query injects tenantId, making
 * cross-tenant leakage structurally impossible at the data-access layer.
 *
 * The repository interface (IBaseRepository) keeps Mongoose behind an
 * abstraction so the database is swappable. See ADR-002.
 */
import { Injectable } from '@nestjs/common';
import { Model, FilterQuery } from 'mongoose';
import type {
  EntityId,
  PaginationOptions,
  PaginatedResponse,
  TenantId,
} from '@constructtrack/types';
import type { IBaseRepository } from '../common/interfaces/base-repository.interface';

@Injectable()
export abstract class BaseRepository<T, TDocument, CreateDto, UpdateDto>
  implements IBaseRepository<T, CreateDto, UpdateDto>
{
  constructor(protected readonly model: Model<TDocument>) {}

  protected abstract toDomain(doc: TDocument): T;
  protected abstract toCreateDoc(tenantId: TenantId, data: CreateDto): Partial<TDocument>;
  protected abstract toUpdateDoc(data: UpdateDto): Partial<TDocument>;

  async findById(tenantId: TenantId, id: EntityId): Promise<T | null> {
    const doc = await this.model
      .findOne({ _id: id, tenantId } as FilterQuery<TDocument>)
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async find(
    tenantId: TenantId,
    filter: Record<string, unknown>,
    options: PaginationOptions = {},
  ): Promise<PaginatedResponse<T>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const query: FilterQuery<TDocument> = { tenantId, ...filter } as FilterQuery<TDocument>;
    const sort = options.sort ?? { createdAt: -1 as const };

    const [docs, totalItems] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(perPage).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  async create(tenantId: TenantId, data: CreateDto): Promise<T> {
    const docData = { ...this.toCreateDoc(tenantId, data) };
    const doc = await this.model.create(docData);
    return this.toDomain(doc);
  }

  async update(tenantId: TenantId, id: EntityId, data: UpdateDto): Promise<T | null> {
    const updateDoc = this.toUpdateDoc(data);
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId } as FilterQuery<TDocument>,
        { $set: updateDoc },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async delete(tenantId: TenantId, id: EntityId): Promise<boolean> {
    const result = await this.model
      .deleteOne({ _id: id, tenantId } as FilterQuery<TDocument>)
      .exec();
    return result.deletedCount > 0;
  }

  async exists(tenantId: TenantId, filter: Record<string, unknown>): Promise<boolean> {
    const doc = await this.model
      .findOne({ tenantId, ...filter } as FilterQuery<TDocument>)
      .select('_id')
      .lean()
      .exec();
    return doc !== null;
  }

  async count(tenantId: TenantId, filter: Record<string, unknown>): Promise<number> {
    return this.model
      .countDocuments({ tenantId, ...filter } as FilterQuery<TDocument>)
      .exec();
  }
}
