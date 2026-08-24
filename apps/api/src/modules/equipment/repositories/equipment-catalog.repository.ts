import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentCatalogItem, EquipmentCatalogItemDocument } from '../../../schemas/equipment-catalog-item.schema';
import { EquipmentCatalogItemDomain, EquipmentCategory } from '@constructtrack/types';

@Injectable()
export class EquipmentCatalogRepository {
  constructor(
    @InjectModel(EquipmentCatalogItem.name)
    private readonly model: Model<EquipmentCatalogItemDocument>,
  ) {}

  private toDomain(doc: EquipmentCatalogItemDocument): EquipmentCatalogItemDomain {
    return {
      id: doc._id.toString(),
      name: doc.name,
      category: doc.category,
    };
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  /**
   * Idempotent bulk insert — the unique {name, category} index makes
   * re-seeding safe; duplicates are ignored.
   */
  async insertManyIfMissing(
    items: Array<{ name: string; category: EquipmentCategory }>,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.model.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { name: item.name, category: item.category },
          update: { $setOnInsert: { name: item.name, category: item.category } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  async findAllSorted(): Promise<EquipmentCatalogItemDomain[]> {
    const docs = await this.model.find().sort({ category: 1, name: 1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }
}
