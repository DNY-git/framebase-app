import { HttpStatus, Injectable, Inject, Logger } from '@nestjs/common';
import * as path from 'path';
import type { DocumentDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentsStorageService } from './documents-storage.service';
import { AuditService } from '../audit/audit.service';
import type { AuthContext } from '../../common/authorization/authorization.types';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface StoredDocument {
  absPath: string;
  document: DocumentDomain;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(DocumentRepository) private readonly documentRepo: DocumentRepository,
    @Inject(DocumentsStorageService) private readonly storage: DocumentsStorageService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  private assertCanUpload(auth: AuthContext): void {
    if (auth.role === 'viewer') {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Viewers cannot upload documents');
    }
  }

  async upload(auth: AuthContext, projectId: string | undefined, file: UploadedFileLike): Promise<DocumentDomain> {
    this.assertCanUpload(auth);
    if (!file || typeof file.path !== 'string' || file.size <= 0) {
      throw new DomainException(ErrorCode.DOCUMENT_EMPTY_FILE, HttpStatus.BAD_REQUEST, 'No file content received');
    }

    const stored = await this.storage.store(auth.tenantId, file.path);

    const document = await this.documentRepo.create(auth.tenantId, {
      name: this.sanitizeName(file.originalname),
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
      fileHash: stored.fileHash,
      storageKey: stored.storageKey,
      projectId,
      uploadedBy: auth.userId,
    });

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'document.upload',
      entityType: 'document',
      entityId: document.id,
      after: document as unknown as Record<string, unknown>,
    });

    return document;
  }

  async list(
    auth: AuthContext,
    filter: { projectId?: string; search?: string },
    options: PaginationOptions,
  ): Promise<PaginatedResponse<DocumentDomain>> {
    const query: Record<string, unknown> = {};
    if (filter.projectId) query.projectId = filter.projectId;
    if (filter.search) query.name = { $regex: filter.search, $options: 'i' } as unknown;
    return this.documentRepo.find(auth.tenantId, query, options);
  }

  async findById(auth: AuthContext, id: string): Promise<DocumentDomain> {
    const document = await this.documentRepo.findById(auth.tenantId, id);
    if (!document) {
      throw new DomainException(ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Document not found');
    }
    return document;
  }

  /** Resolves the stored document together with its absolute on-disk path. */
  async resolveForDownload(auth: AuthContext, id: string): Promise<StoredDocument> {
    const document = await this.findById(auth, id);
    const absPath = await this.storage.resolve(auth.tenantId, document.storageKey);
    return { absPath, document };
  }

  async remove(auth: AuthContext, id: string): Promise<void> {
    const document = await this.findById(auth, id);
    const isOwner = document.uploadedBy === auth.userId;
    const isAdmin = auth.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Only the uploader or an admin can delete this document');
    }

    await this.storage.remove(auth.tenantId, document.storageKey);
    const deleted = await this.documentRepo.delete(auth.tenantId, id);
    if (!deleted) {
      throw new DomainException(ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Document not found');
    }

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'document.delete',
      entityType: 'document',
      entityId: id,
      before: document as unknown as Record<string, unknown>,
    });
  }

  private sanitizeName(name: string): string {
    const base = path.basename(String(name ?? 'file'));
    return base.length > 200 ? base.slice(-200) : base;
  }
}