import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StockLevel, StockLevelDocument } from '../../../schemas/stock-level.schema';
import { BaseRepository } from '../../../database/base.repository';
import { StockLevelDomain, TenantId } from '@constructtrack/types';

@Injectable()
export class StockLevelRepository extends BaseRepository<
  StockLevelDomain,
  StockLevelDocument,
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor(
    @InjectModel(StockLevel.name)
    model: Model<StockLevelDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: StockLevelDocument): StockLevelDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      materialId: doc.materialId.toString(),
      quantity: doc.quantity,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: Record<string, unknown>,
  ): Partial<StockLevelDocument> {
    return {
      tenantId,
      materialId: data.materialId as string,
      quantity: (data.quantity as number) ?? 0,
    };
  }

  protected toUpdateDoc(data: Record<string, unknown>): Partial<StockLevelDocument> {
    const doc: Partial<StockLevelDocument> = {};
    if (data.quantity !== undefined) doc.quantity = data.quantity as number;
    return doc;
  }

  async findByMaterialId(
    tenantId: string,
    materialId: string,
  ): Promise<StockLevelDomain | null> {
    const doc = await this.model.findOne({ tenantId, materialId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findLowStock(
    tenantId: string,
    reorderPointField: 'reorderPoint',
    materialIds: string[],
  ): Promise<StockLevelDomain[]> {
    const docs = await this.model
      .find({
        tenantId,
        materialId: { $in: materialIds },
        quantity: { $lte: 0 },
      })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Atomically consumes stock for a material.
   * Uses findOneAndUpdate with a $gte condition to prevent race conditions.
   * Returns the updated stock level, or null if insufficient stock.
   */
  async atomicConsume(
    tenantId: string,
    materialId: string,
    quantity: number,
  ): Promise<StockLevelDomain | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { tenantId, materialId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Atomically increments stock for a material.
   * If no stock level exists, creates one with the given quantity.
   */
  async atomicIncrement(
    tenantId: string,
    materialId: string,
    quantity: number,
  ): Promise<StockLevelDomain> {
    const doc = await this.model
      .findOneAndUpdate(
        { tenantId, materialId },
        { $inc: { quantity } },
        { new: true, upsert: true },
      )
      .exec();
    return this.toDomain(doc);
  }
}
