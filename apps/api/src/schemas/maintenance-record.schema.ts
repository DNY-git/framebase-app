import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MaintenanceRecordDomain, MaintenanceType, MaintenanceStatus } from '@constructtrack/types';

export type MaintenanceRecordDocument = MaintenanceRecord & Document;

@Schema({ collection: 'maintenance_records', timestamps: true })
export class MaintenanceRecord implements Omit<MaintenanceRecordDomain, 'id'> {
  @Prop({ type: String, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true, index: true })
  equipmentId!: string;

  @Prop({ type: String, enum: Object.values(MaintenanceType), required: true })
  type!: MaintenanceType;

  @Prop({ type: String, enum: Object.values(MaintenanceStatus), required: true })
  status!: MaintenanceStatus;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: Date })
  nextDueAt?: Date;

  @Prop({ type: Number })
  costCents?: number;

  @Prop({ type: String })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MaintenanceRecordSchema = SchemaFactory.createForClass(MaintenanceRecord);

// Query for upcoming maintenance
MaintenanceRecordSchema.index({ tenantId: 1, nextDueAt: 1 });
