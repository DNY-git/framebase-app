import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DowntimeLogDomain, DowntimeReason } from '@constructtrack/types';

export type DowntimeLogDocument = DowntimeLog & Document;

@Schema({ collection: 'downtime_logs', timestamps: true })
export class DowntimeLog implements Omit<DowntimeLogDomain, 'id'> {
  @Prop({ type: String, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true, index: true })
  equipmentId!: string;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: String, enum: Object.values(DowntimeReason), required: true })
  reason!: DowntimeReason;

  @Prop({ type: String })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DowntimeLogSchema = SchemaFactory.createForClass(DowntimeLog);

// Querying active downtime for an equipment
DowntimeLogSchema.index({ equipmentId: 1, endDate: 1 });
