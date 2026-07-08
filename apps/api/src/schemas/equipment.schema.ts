import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { EquipmentStatus } from '@constructtrack/types';

export type EquipmentDocument = Equipment & Document;

@Schema({ timestamps: true, collection: 'equipment' })
export class Equipment {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  serialNumber!: string;

  @Prop({ type: String, required: true })
  category!: string;

  @Prop({ type: String, enum: EquipmentStatus, default: EquipmentStatus.AVAILABLE, index: true })
  status!: EquipmentStatus;

  @Prop({ type: Date })
  purchaseDate?: Date;

  @Prop({ type: Number })
  purchaseCostCents?: number;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);

// Compound indexes per schema.md
EquipmentSchema.index({ tenantId: 1, serialNumber: 1 }, { unique: true });
EquipmentSchema.index({ tenantId: 1, status: 1 });
EquipmentSchema.index({ tenantId: 1, category: 1 });
