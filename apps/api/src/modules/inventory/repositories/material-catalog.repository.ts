import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MaterialCatalogItem, MaterialCatalogItemDocument } from '../../../schemas/material-catalog-item.schema';
import { MaterialCatalogItemDomain, MaterialCategory } from '@constructtrack/types';

@Injectable()
export class MaterialCatalogRepository {
  constructor(
    @InjectModel(MaterialCatalogItem.name)
    private readonly model: Model<MaterialCatalogItemDocument>,
  ) {}

  private toDomain(doc: MaterialCatalogItemDocument): MaterialCatalogItemDomain {
    return {
      id: doc._id.toString(),
      name: doc.name,
      category: doc.category,
      unit: doc.unit,
      sku: doc.sku,
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
    items: Array<{ name: string; category: MaterialCategory; unit?: string; sku?: string }>,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.model.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { name: item.name, category: item.category },
          update: {
            $setOnInsert: {
              name: item.name,
              category: item.category,
              unit: item.unit,
              sku: item.sku,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  async findAllSorted(): Promise<MaterialCatalogItemDomain[]> {
    const docs = await this.model.find().sort({ category: 1, name: 1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }
}
