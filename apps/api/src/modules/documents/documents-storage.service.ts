import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { DomainException } from '../../common/exceptions/domain.exception';
import { ErrorCode } from '@constructtrack/types';

export interface StoredFileInfo {
  storageKey: string;
  fileHash: string;
}

/**
 * Local disk-backed document storage.
 *
 * Files live under `<cwd>/storage/uploads/<tenantId>/<sha256>`. Keys are
 * content-addressed (sha256 of the file) so identical uploads are
 * deduplicated. The `storage/` directory is git-ignored by design (ADR-002:
 * object storage arrives later; this is the local driver).
 */
@Injectable()
export class DocumentsStorageService {
  private readonly logger = new Logger(DocumentsStorageService.name);
  private readonly rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir ?? path.resolve(process.cwd(), 'storage', 'uploads');
  }

  private tenantDir(tenantId: string): string {
    return path.join(this.rootDir, tenantId);
  }

  private assertSafeKey(storageKey: string): void {
    if (
      typeof storageKey !== 'string' ||
      storageKey.length === 0 ||
      storageKey.includes('..') ||
      storageKey.includes('/') ||
      storageKey.includes('\\')
    ) {
      throw new DomainException(ErrorCode.DOCUMENT_STORAGE_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Invalid storage key');
    }
  }

  async resolve(tenantId: string, storageKey: string): Promise<string> {
    this.assertSafeKey(storageKey);
    const dir = this.tenantDir(tenantId);
    const abs = path.join(dir, storageKey);
    const real = await fsp.realpath(abs).catch(() => null);
    if (!real) {
      throw new DomainException(ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'File missing on disk');
    }
    if (!real.startsWith(path.resolve(dir))) {
      throw new DomainException(ErrorCode.DOCUMENT_STORAGE_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Invalid storage key');
    }
    return real;
  }

  async store(tenantId: string, sourcePath: string): Promise<StoredFileInfo> {
    let buffer: Buffer;
    try {
      buffer = await fsp.readFile(sourcePath);
    } catch {
      throw new DomainException(ErrorCode.DOCUMENT_STORAGE_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Could not read uploaded file');
    }
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const storageKey = fileHash;
    this.assertSafeKey(storageKey);

    const dir = this.tenantDir(tenantId);
    const dest = path.join(dir, storageKey);
    try {
      if (fs.existsSync(dest)) {
        // Dedupe: another upload already stored this exact content.
        await fsp.unlink(sourcePath).catch(() => {});
      } else {
        await fsp.mkdir(dir, { recursive: true });
        await fsp.rename(sourcePath, dest).catch(async (err: NodeJS.ErrnoException) => {
          if (err && err.code === 'EXDEV') {
            await fsp.copyFile(sourcePath, dest);
            await fsp.unlink(sourcePath).catch(() => {});
            return;
          }
          throw err;
        });
      }
    } catch {
      throw new DomainException(ErrorCode.DOCUMENT_STORAGE_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to persist uploaded file');
    }
    return { storageKey, fileHash };
  }

  async remove(tenantId: string, storageKey: string): Promise<void> {
    this.assertSafeKey(storageKey);
    const abs = await this.resolve(tenantId, storageKey).catch(() => null);
    if (abs) {
      await fsp.unlink(abs).catch((err) => this.logger.warn(`Failed to delete ${abs}: ${String(err)}`));
    }
  }
}