import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import type { DocumentDomain } from '@constructtrack/types';

export type DocumentRecord = DocumentEntity & Document;

@Schema({ timestamps: true, collection: 'documents' })
export class DocumentEntity implements Omit<DocumentDomain, 'id'> {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: Number, required: true })
  sizeBytes!: number;

  @Prop({ type: String, required: true })
  fileHash!: string;

  @Prop({ type: String, required: true })
  storageKey!: string;

  @Prop({ type: SchemaTypes.ObjectId })
  projectId?: string;

  @Prop({ type: String, required: true })
  uploadedBy!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);
DocumentSchema.index({ tenantId: 1, projectId: 1 });
DocumentSchema.index({ tenantId: 1, name: 1 });
