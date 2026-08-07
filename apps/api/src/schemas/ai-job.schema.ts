import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { AiJobStatus, AiJobType } from '@constructtrack/types';

export type AiJobDocument = AiJob & Document;

@Schema({
  collection: 'ai_jobs',
  timestamps: true,
})
export class AiJob {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: Object.values(AiJobType) })
  type!: AiJobType;

  @Prop({ type: String, required: true, enum: Object.values(AiJobStatus), default: AiJobStatus.PENDING })
  status!: AiJobStatus;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  params!: Record<string, unknown>;

  @Prop({ type: String })
  result?: string;

  @Prop({ type: [{ entityType: String, entityId: String, label: String }] })
  citations?: Array<{ entityType: string; entityId: string; label: string }>;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String, required: true, default: 'none' })
  provider!: string;

  @Prop({ type: String })
  model?: string;

  @Prop({ type: Number })
  inputTokens?: number;

  @Prop({ type: Number })
  outputTokens?: number;

  @Prop({ type: Number })
  costCents?: number;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const AiJobSchema = SchemaFactory.createForClass(AiJob);

AiJobSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
