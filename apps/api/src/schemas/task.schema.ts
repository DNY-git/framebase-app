import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TaskStatus, TaskPriority } from '@constructtrack/types';

export type TaskDocument = Task & Document;

@Schema({
  collection: 'tasks',
  timestamps: true,
})
export class Task {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  phaseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  parentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  assigneeId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.TODO,
    required: true,
  })
  status!: TaskStatus;

  @Prop({
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM,
    required: true,
  })
  priority!: TaskPriority;

  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @Prop({ type: Number, required: true, default: 0 })
  order!: number;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Indexes
TaskSchema.index({ tenantId: 1, projectId: 1 });
TaskSchema.index({ tenantId: 1, assigneeId: 1, status: 1 });
