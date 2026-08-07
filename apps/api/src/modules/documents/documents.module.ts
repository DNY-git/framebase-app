import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentEntity, DocumentSchema } from '../../schemas/document.schema';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsStorageService } from './documents-storage.service';
import { DocumentRepository } from './repositories/document.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DocumentEntity.name, schema: DocumentSchema }]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentRepository, DocumentsStorageService],
  exports: [DocumentsService],
})
export class DocumentsModule {}