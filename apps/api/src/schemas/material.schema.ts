import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type MaterialDocument = Material & Document;

@Schema({ timestamps: true, collection: 'materials' })
export class Material {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true })
  sku!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  unit!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  reorderPoint!: number;

  @Prop({ type: Date, default: null })
  archivedAt?: Date | null;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);

MaterialSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
MaterialSchema.index({ tenantId: 1, name: 1 });
MaterialSchema.index({ tenantId: 1, archivedAt: 1 });
