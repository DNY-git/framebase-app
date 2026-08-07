import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type AiFeedbackDocument = AiFeedback & Document;

@Schema({
  collection: 'ai_feedback',
  timestamps: true,
})
export class AiFeedback {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  messageId!: string;

  @Prop({ type: SchemaTypes.ObjectId })
  jobId?: string;

  @Prop({ type: String, required: true, enum: ['up', 'down'] })
  rating!: 'up' | 'down';

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const AiFeedbackSchema = SchemaFactory.createForClass(AiFeedback);

AiFeedbackSchema.index({ tenantId: 1, messageId: 1 });
