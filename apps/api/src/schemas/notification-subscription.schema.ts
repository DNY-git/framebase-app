import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { NotificationType, NotificationChannel } from '@constructtrack/types';

export type NotificationSubscriptionDocument = NotificationSubscription & Document;

@Schema({
  collection: 'notification_subscriptions',
  timestamps: true,
})
export class NotificationSubscription {
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

  @Prop({ type: [String], default: ['in_app'] })
  channels!: NotificationChannel[];

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const NotificationSubscriptionSchema = SchemaFactory.createForClass(NotificationSubscription);

NotificationSubscriptionSchema.index({ tenantId: 1, userId: 1, type: 1 }, { unique: true });
