import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { DocumentsService, UploadedFileLike } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { resolveStorageRoot } from '../../common/utils/storage-root.util';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const TMP_UPLOAD_DIR = path.join(resolveStorageRoot(), 'storage', 'uploads', '.tmp');

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = TMP_UPLOAD_DIR;
          fsp
            .mkdir(dir, { recursive: true })
            .then(() => cb(null, dir))
            .catch((err: NodeJS.ErrnoException) => cb(err, ''));
        },
        filename: (_req, _file, cb) => cb(null, randomUUID()),
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: UploadedFileLike,
  ) {
    const document = await this.documentsService.upload(user, dto.projectId, file);
    return { data: document };
  }

  @Get()
  async find(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.documentsService.list(user, { projectId, search }, options);
    return formatPaginatedResponse(result);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const document = await this.documentsService.findById(user, id);
    return { data: document };
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { absPath, document } = await this.documentsService.resolveForDownload(user, id);
    res.set({
      'Content-Type': document.mimeType,
      'Content-Length': String(document.sizeBytes),
      'Content-Disposition': `inline; filename="${filenameSafe(document.name)}"`,
    });
    return res.sendFile(absPath);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.documentsService.remove(user, id);
  }
}

function filenameSafe(name: string): string {
  return String(name ?? 'unknown').replace(/["\r\n]/g, '_');
}