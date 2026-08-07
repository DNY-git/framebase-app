import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { TransactionType } from '@constructtrack/types';

export type InventoryTransactionDocument = InventoryTransaction & Document;

@Schema({ timestamps: true, collection: 'inventory_transactions' })
export class InventoryTransaction {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, enum: TransactionType, required: true, index: true })
  type!: TransactionType;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  materialId!: string;

  @Prop({ type: SchemaTypes.ObjectId })
  projectId?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  taskId?: string;

  @Prop({ type: Number })
  costCents?: number;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: String, required: true })
  actorId!: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);

InventoryTransactionSchema.index({ tenantId: 1, materialId: 1, createdAt: -1 });
InventoryTransactionSchema.index({ tenantId: 1, projectId: 1 });
InventoryTransactionSchema.index({ tenantId: 1, type: 1 });
InventoryTransactionSchema.index({ tenantId: 1, taskId: 1 });
