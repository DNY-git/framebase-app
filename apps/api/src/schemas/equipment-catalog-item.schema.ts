import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EquipmentCategory } from '@constructtrack/types';

export type EquipmentCatalogItemDocument = EquipmentCatalogItem & Document;

/**
 * Global construction-equipment catalog. A catalog item is a TYPE of
 * equipment ("Excavator"), not a physical asset — assets live in the
 * `equipment` collection with their own serial number, purchase data and
 * project assignments.
 */
@Schema({ timestamps: true, collection: 'equipment_catalog_items' })
export class EquipmentCatalogItem {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, enum: EquipmentCategory, required: true })
  category!: EquipmentCategory;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const EquipmentCatalogItemSchema = SchemaFactory.createForClass(EquipmentCatalogItem);

// A given type of equipment appears once per category.
EquipmentCatalogItemSchema.index({ name: 1, category: 1 }, { unique: true });
