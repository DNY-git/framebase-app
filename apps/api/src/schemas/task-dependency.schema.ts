import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDependencyDocument = TaskDependency & Document;

@Schema({
  collection: 'task_dependencies',
  timestamps: { createdAt: true, updatedAt: false }, // Only need createdAt for dependencies
})
export class TaskDependency {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  predecessorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  successorId!: Types.ObjectId;

  @Prop({ type: Date })
  createdAt!: Date;
}

export const TaskDependencySchema = SchemaFactory.createForClass(TaskDependency);

// Indexes
TaskDependencySchema.index({ predecessorId: 1, successorId: 1 }, { unique: true });
TaskDependencySchema.index({ tenantId: 1, projectId: 1 });
