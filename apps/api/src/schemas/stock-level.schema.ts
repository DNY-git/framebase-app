import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type StockLevelDocument = StockLevel & Document;

@Schema({ timestamps: true, collection: 'stock_levels' })
export class StockLevel {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  materialId!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  quantity!: number;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const StockLevelSchema = SchemaFactory.createForClass(StockLevel);

StockLevelSchema.index({ tenantId: 1, materialId: 1 }, { unique: true });
StockLevelSchema.index({ tenantId: 1, quantity: 1 });
