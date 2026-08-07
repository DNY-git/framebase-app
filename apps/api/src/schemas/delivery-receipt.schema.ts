import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type DeliveryReceiptDocument = DeliveryReceipt & Document;

@Schema({ timestamps: true, collection: 'delivery_receipts' })
export class DeliveryReceipt {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true })
  supplier!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  materialId!: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number })
  costCents?: number;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const DeliveryReceiptSchema = SchemaFactory.createForClass(DeliveryReceipt);

DeliveryReceiptSchema.index({ tenantId: 1, materialId: 1, createdAt: -1 });
DeliveryReceiptSchema.index({ tenantId: 1, supplier: 1 });
