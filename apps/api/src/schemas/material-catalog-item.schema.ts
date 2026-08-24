import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MaterialCategory } from '@constructtrack/types';

export type MaterialCatalogItemDocument = MaterialCatalogItem & Document;

/**
 * Global construction-material catalog. A catalog item is a TYPE of
 * material ("Cement Portland 42.5R"), not a stocked lot — stocked lots
 * live in the `materials` collection with their own sku, unit and
 * reorder point. Users pick from this catalog when creating a material.
 */
@Schema({ timestamps: true, collection: 'material_catalog_items' })
export class MaterialCatalogItem {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, enum: MaterialCategory, required: true })
  category!: MaterialCategory;

  @Prop({ type: String })
  unit?: string;

  @Prop({ type: String })
  sku?: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const MaterialCatalogItemSchema = SchemaFactory.createForClass(MaterialCatalogItem);

// A given material appears once per category.
MaterialCatalogItemSchema.index({ name: 1, category: 1 }, { unique: true });
