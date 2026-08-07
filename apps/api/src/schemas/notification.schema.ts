import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { NotificationType } from '@constructtrack/types';

export type NotificationDocument = Notification & Document;

@Schema({
  collection: 'notifications',
  timestamps: true,
})
export class Notification {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: [
    'task.assigned', 'task.due_soon', 'task.blocked', 'task.overdue',
    'task.unblocked', 'dependency.completed', 'inventory.below_reorder',
    'equipment.maintenance_due', 'report.completed', 'report.failed',
    'project.status_changed',
  ]})
  type!: NotificationType;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  body!: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ type: String })
  link?: string;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ tenantId: 1, userId: 1, readAt: 1 });
NotificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
