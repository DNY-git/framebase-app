import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type EquipmentAssignmentDocument = EquipmentAssignment & Document;

@Schema({ timestamps: true, collection: 'equipment_assignments' })
export class EquipmentAssignment {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  equipmentId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId!: string;

  @Prop({ type: SchemaTypes.ObjectId })
  operatorId?: string;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const EquipmentAssignmentSchema = SchemaFactory.createForClass(EquipmentAssignment);

EquipmentAssignmentSchema.index({ equipmentId: 1, active: 1 });
