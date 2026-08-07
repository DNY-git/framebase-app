import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { DocumentDomain } from '@constructtrack/types';
import { ErrorCode, Role } from '@constructtrack/types';
import { DocumentsService, UploadedFileLike } from './documents.service';
import { DocumentsStorageService } from './documents-storage.service';

describe('DocumentsService', () => {
  let documentRepo: Record<string, ReturnType<typeof vi.fn>>;
  let storage: DocumentsStorageService;
  let auditService: { record: ReturnType<typeof vi.fn> };
  let service: DocumentsService;

  const tenantId = 'tenant-1';
  const userId = 'user-1';

  const mockDoc: DocumentDomain = {
    id: 'doc-1',
    tenantId,
    name: 'contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    fileHash: 'abc',
    storageKey: 'abc',
    uploadedBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'ct-docs-'));
    documentRepo = {
      create: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
    };
    storage = new DocumentsStorageService(tmpRoot);
    auditService = { record: vi.fn() };
    service = new DocumentsService(documentRepo as never, storage, auditService as never);
  });

  const makeFile = (overrides: Partial<UploadedFileLike> = {}): UploadedFileLike => ({
    originalname: 'contract.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    path: '/tmp/uploaded.bin',
    ...overrides,
  });

  describe('upload', () => {
    it('stores the file, creates a document, and audits', async () => {
      documentRepo.create.mockResolvedValue(mockDoc);
      // point the source file at a real temp file so storage can read+hash it
      const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ct-src-'));
      const src = path.join(dir, 'src.bin');
      const content = Buffer.from('pdf-bytes');
      await fsp.writeFile(src, content);
      service = new DocumentsService(documentRepo as never, new DocumentsStorageService(dir), auditService as never);

      const result = await service.upload(
        { userId, tenantId, role: Role.SITE_ENGINEER },
        undefined,
        { originalname: 'contract.pdf', mimetype: 'application/pdf', size: content.length, path: src },
      );

      expect(result).toEqual(mockDoc);
      expect(documentRepo.create).toHaveBeenCalledWith(tenantId, expect.objectContaining({ name: 'contract.pdf' }));
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'document.upload' }));
    });

    it('throws when no file content is provided', async () => {
      await expect(service.upload({ tenantId, userId, role: Role.SITE_ENGINEER } as never, undefined, {} as UploadedFileLike))
        .rejects.toMatchObject({ errorCode: ErrorCode.DOCUMENT_EMPTY_FILE });
    });

    it('rejects viewers', async () => {
      const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ct-src-'));
      const src = path.join(dir, 'src.bin');
      await fsp.writeFile(src, 'x');
      await expect(
        service.upload({ tenantId, userId, role: Role.VIEWER }, undefined, makeFile({ path: src })),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });

  describe('list', () => {
    it('passes filters to the repository', async () => {
      documentRepo.find.mockResolvedValue({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 });
      await service.list({ tenantId, userId, role: Role.VIEWER } as never, { projectId: 'p-1', search: 'con' }, { page: 1, perPage: 10 });
      expect(documentRepo.find).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ projectId: 'p-1', name: expect.anything() as unknown }),
        { page: 1, perPage: 10 },
      );
    });

    it('omits empty filters', async () => {
      documentRepo.find.mockResolvedValue({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 });
      await service.list({ tenantId, userId } as never, {}, {});
      expect(documentRepo.find).toHaveBeenCalledWith(tenantId, {}, {});
    });
  });

  describe('findById', () => {
    it('throws DOCUMENT_NOT_FOUND when missing', async () => {
      documentRepo.findById.mockResolvedValue(null);
      await expect(service.findById({ tenantId, userId } as never, 'missing')).rejects
        .toMatchObject({ errorCode: ErrorCode.DOCUMENT_NOT_FOUND });
    });
  });

  describe('remove', () => {
    it('allows the uploader to delete', async () => {
      documentRepo.findById.mockResolvedValue(mockDoc);
      documentRepo.delete.mockResolvedValue(true);
      await service.remove({ tenantId, userId, role: Role.SITE_ENGINEER } as never, 'doc-1');
      expect(documentRepo.delete).toHaveBeenCalledWith(tenantId, 'doc-1');
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'document.delete' }));
    });

    it('allows an admin to delete someone else’s upload', async () => {
      documentRepo.findById.mockResolvedValue({ ...mockDoc, uploadedBy: 'someone-else' });
      documentRepo.delete.mockResolvedValue(true);
      await service.remove({ tenantId, userId, role: Role.ADMIN } as never, 'doc-1');
      expect(documentRepo.delete).toHaveBeenCalledWith(tenantId, 'doc-1');
    });

    it('rejects a non-owner, non-admin deleter', async () => {
      documentRepo.findById.mockResolvedValue({ ...mockDoc, uploadedBy: 'someone-else' });
      await expect(service.remove({ tenantId, userId, role: Role.SITE_ENGINEER } as never, 'doc-1'))
        .rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });

  describe('sanitisation', () => {
    it('strips path segments from the stored name', async () => {
      documentRepo.create.mockImplementation((_t: string, data: { name: string }) => ({ ...mockDoc, name: data.name }));
      const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ct-src-'));
      const src = path.join(dir, 'src.bin');
      await fsp.writeFile(src, 'x');
      const result = await service.upload({ tenantId, userId, role: Role.CREW }, undefined, makeFile({ originalname: '../../evil.pdf', path: src }));
      expect(result.name).toBe('evil.pdf');
    });
  });
});