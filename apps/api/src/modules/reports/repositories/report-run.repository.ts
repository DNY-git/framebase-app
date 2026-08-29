import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { ReportRun, ReportRunDocument } from '../../../schemas/report-run.schema';
import { BaseRepository } from '../../../database/base.repository';
import { ReportRunDomain, ReportStatus, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { GenerateReportDto } from '../dto/generate-report.dto';

@Injectable()
export class ReportRunRepository extends BaseRepository<ReportRunDomain, ReportRunDocument, Partial<GenerateReportDto>, Partial<ReportRunDomain>> {
  constructor(
    @InjectModel(ReportRun.name)
    model: Model<ReportRunDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: ReportRunDocument): ReportRunDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      templateId: doc.templateId.toString(),
      templateName: doc.templateName,
      status: doc.status,
      params: doc.params,
      resultUrl: doc.resultUrl,
      resultData: doc.resultData ?? null,
      errorMessage: doc.errorMessage,
      requestedBy: doc.requestedBy,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
    };
  }

  protected toCreateDoc(
    tenantId: string,
    data: Partial<GenerateReportDto> & { requestedBy?: string; templateName?: string },
  ): Partial<ReportRunDocument> {
    return {
      tenantId,
      templateId: data.templateId!,
      templateName: data.templateName,
      status: ReportStatus.PENDING,
      params: data.params ?? {},
      requestedBy: data.requestedBy ?? '',
    };
  }

  protected toUpdateDoc(data: Partial<ReportRunDomain>): Partial<ReportRunDocument> {
    const out: Partial<ReportRunDocument> = {};
    if (data.status !== undefined) out.status = data.status;
    if (data.resultUrl !== undefined) out.resultUrl = data.resultUrl;
    if (data.resultData !== undefined) out.resultData = data.resultData;
    if (data.errorMessage !== undefined) out.errorMessage = data.errorMessage;
    if (data.completedAt !== undefined) out.completedAt = data.completedAt;
    return out;
  }

  /** Number of runs generated from a template (delete-guard). */
  async countByTemplate(tenantId: string, templateId: string): Promise<number> {
    return this.model
      .countDocuments({ tenantId, templateId })
      .exec();
  }

  async findByTenant(
    tenantId: string,
    options: PaginationOptions,
    filter?: Record<string, unknown>,
  ): Promise<PaginatedResponse<ReportRunDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const query: FilterQuery<ReportRunDocument> = { tenantId, ...filter } as FilterQuery<ReportRunDocument>;
    const [docs, totalItems] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }
}
