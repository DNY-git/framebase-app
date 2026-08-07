import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ReportStatus } from '@constructtrack/types';
import type { ReportRunDomain } from '@constructtrack/types';

export type ReportRunDocument = ReportRun & Document;

@Schema({ timestamps: true, collection: 'report_runs' })
export class ReportRun implements Omit<ReportRunDomain, 'id'> {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  templateId!: string;

  @Prop({ type: String, enum: ReportStatus, required: true, default: ReportStatus.PENDING })
  status!: ReportStatus;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  params!: Record<string, unknown>;

  @Prop({ type: String })
  resultUrl?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String, required: true })
  requestedBy!: string;

  createdAt!: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  updatedAt!: Date;
}

export const ReportRunSchema = SchemaFactory.createForClass(ReportRun);
ReportRunSchema.index({ tenantId: 1, templateId: 1 });
ReportRunSchema.index({ tenantId: 1, status: 1 });
ReportRunSchema.index({ tenantId: 1, createdAt: -1 });
