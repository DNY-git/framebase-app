import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportTemplate, ReportTemplateDocument } from '../../../schemas/report-template.schema';
import { BaseRepository } from '../../../database/base.repository';
import { ReportTemplateDomain } from '@constructtrack/types';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';

@Injectable()
export class ReportTemplateRepository extends BaseRepository<ReportTemplateDomain, ReportTemplateDocument, CreateReportTemplateDto, Partial<CreateReportTemplateDto>> {
  constructor(
    @InjectModel(ReportTemplate.name)
    model: Model<ReportTemplateDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: ReportTemplateDocument): ReportTemplateDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      name: doc.name,
      description: doc.description,
      type: doc.type,
      config: doc.config,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateReportTemplateDto & { createdBy?: string }): Partial<ReportTemplateDocument> {
    return {
      tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      config: data.config ?? {},
      createdBy: data.createdBy ?? '',
    };
  }

  protected toUpdateDoc(data: Partial<CreateReportTemplateDto>): Partial<ReportTemplateDocument> {
    const out: Partial<ReportTemplateDocument> = {};
    if (data.name !== undefined) out.name = data.name;
    if (data.description !== undefined) out.description = data.description;
    if (data.type !== undefined) out.type = data.type;
    if (data.config !== undefined) out.config = data.config;
    return out;
  }
}
