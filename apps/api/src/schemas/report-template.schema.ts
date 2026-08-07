import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import type { ReportTemplateDomain } from '@constructtrack/types';

export type ReportTemplateDocument = ReportTemplate & Document;

@Schema({ timestamps: true, collection: 'report_templates' })
export class ReportTemplate implements Omit<ReportTemplateDomain, 'id'> {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  config!: Record<string, unknown>;

  @Prop({ type: String, required: true })
  createdBy!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReportTemplateSchema = SchemaFactory.createForClass(ReportTemplate);
ReportTemplateSchema.index({ tenantId: 1, type: 1 });
