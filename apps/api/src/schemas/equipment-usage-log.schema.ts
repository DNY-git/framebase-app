import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EquipmentUsageLogDomain } from '@constructtrack/types';

export type EquipmentUsageLogDocument = EquipmentUsageLog & Document;

@Schema({ collection: 'equipment_usage_logs', timestamps: true })
export class EquipmentUsageLog implements Omit<EquipmentUsageLogDomain, 'id'> {
  @Prop({ type: String, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true, index: true })
  equipmentId!: string;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: Number, required: true })
  hoursUsed!: number;

  @Prop({ type: String })
  operatorId?: string;

  @Prop({ type: String })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const EquipmentUsageLogSchema = SchemaFactory.createForClass(EquipmentUsageLog);

// A piece of equipment usually only has one log per day
EquipmentUsageLogSchema.index({ equipmentId: 1, date: 1 }, { unique: true });
