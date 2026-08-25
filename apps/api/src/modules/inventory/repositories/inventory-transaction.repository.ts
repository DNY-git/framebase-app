import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { InventoryTransaction, InventoryTransactionDocument } from '../../../schemas/inventory-transaction.schema';
import { BaseRepository } from '../../../database/base.repository';
import { InventoryTransactionDomain, TransactionType, TenantId, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

/** Create shape — callers must attribute the movement to the acting user. */
export type CreateInventoryTransactionData = CreateTransactionDto & { actorId: string };

@Injectable()
export class InventoryTransactionRepository extends BaseRepository<
  InventoryTransactionDomain,
  InventoryTransactionDocument,
  CreateInventoryTransactionData,
  Record<string, unknown>
> {
  constructor(
    @InjectModel(InventoryTransaction.name)
    model: Model<InventoryTransactionDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: InventoryTransactionDocument): InventoryTransactionDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      type: doc.type,
      quantity: doc.quantity,
      materialId: doc.materialId.toString(),
      projectId: doc.projectId?.toString(),
      taskId: doc.taskId?.toString(),
      costCents: doc.costCents,
      note: doc.note,
      actorId: doc.actorId,
      createdAt: doc.createdAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: CreateInventoryTransactionData,
  ): Partial<InventoryTransactionDocument> {
    return {
      tenantId,
      type: data.type,
      quantity: data.type === 'consume' ? -Math.abs(data.quantity) : Math.abs(data.quantity),
      materialId: data.materialId,
      projectId: data.projectId,
      taskId: data.taskId,
      costCents: data.costCents,
      note: data.note,
      actorId: data.actorId,
    };
  }

  protected toUpdateDoc(): Partial<InventoryTransactionDocument> {
    return {};
  }

  async findByMaterial(
    tenantId: string,
    materialId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const filter: FilterQuery<InventoryTransactionDocument> = { tenantId, materialId };
    const [docs, totalItems] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  async findByTask(
    tenantId: string,
    taskId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const filter: FilterQuery<InventoryTransactionDocument> = { tenantId, taskId };
    const [docs, totalItems] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  async findByFilter(
    tenantId: string,
    filter: Record<string, unknown>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const query: FilterQuery<InventoryTransactionDocument> = { tenantId, ...filter } as FilterQuery<InventoryTransactionDocument>;
    const [docs, totalItems] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).exec(),
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

  /**
   * Aggregates purchase cost (receive transactions with costCents) by
   * project and by calendar month. Used by the dashboard spending trend.
   */
  async sumCostCentsByProjectAndMonth(
    tenantId: string,
    options: { since: Date },
  ): Promise<Array<{ projectId: string | null; monthKey: string; total: number }>> {
    const rows = await this.model.aggregate<{
      _id: { projectId: string | null; month: string };
      total: number;
    }>([
      {
        $match: {
          tenantId,
          type: TransactionType.RECEIVE,
          costCents: { $gt: 0 },
          createdAt: { $gte: options.since },
        },
      },
      {
        $group: {
          _id: {
            projectId: { $ifNull: ['$projectId', null] },
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          },
          total: { $sum: '$costCents' },
        },
      },
    ]);

    return rows.map((r) => ({
      projectId: r._id.projectId,
      monthKey: r._id.month,
      total: r.total,
    }));
  }
}
