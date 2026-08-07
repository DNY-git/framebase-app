import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentEntity, DocumentRecord } from '../../../schemas/document.schema';
import { BaseRepository } from '../../../database/base.repository';
import type { DocumentDomain } from '@constructtrack/types';

export interface CreateDocumentData {
  name: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  storageKey: string;
  projectId?: string;
  uploadedBy?: string;
}

export interface UpdateDocumentData {
  name?: string;
  projectId?: string;
}

@Injectable()
export class DocumentRepository extends BaseRepository<
  DocumentDomain,
  DocumentRecord,
  CreateDocumentData,
  UpdateDocumentData
> {
  constructor(
    @InjectModel(DocumentEntity.name)
    model: Model<DocumentRecord>,
  ) {
    super(model);
  }

  protected toDomain(doc: DocumentRecord): DocumentDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      name: doc.name,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      fileHash: doc.fileHash,
      storageKey: doc.storageKey,
      projectId: doc.projectId ? doc.projectId.toString() : undefined,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateDocumentData): Partial<DocumentRecord> {
    return {
      tenantId,
      name: data.name,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      fileHash: data.fileHash,
      storageKey: data.storageKey,
      projectId: data.projectId,
      uploadedBy: data.uploadedBy ?? '',
    };
  }

  protected toUpdateDoc(data: UpdateDocumentData): Partial<DocumentRecord> {
    const out: Partial<DocumentRecord> = {};
    if (data.name !== undefined) out.name = data.name;
    if (data.projectId !== undefined) out.projectId = data.projectId;
    return out;
  }
}
