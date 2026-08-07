import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiJob, AiJobDocument } from '../../../schemas/ai-job.schema';
import { BaseRepository } from '../../../database/base.repository';
import { AiJobDomain, AiJobStatus, AiJobType, PaginationOptions, PaginatedResponse } from '@constructtrack/types';

export interface CreateAiJobDto {
  userId: string;
  type: AiJobType;
  params?: Record<string, unknown>;
  provider?: string;
}

@Injectable()
export class AiJobRepository extends BaseRepository<AiJobDomain, AiJobDocument, CreateAiJobDto, Partial<AiJobDomain>> {
  constructor(
    @InjectModel(AiJob.name)
    model: Model<AiJobDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: AiJobDocument): AiJobDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      userId: doc.userId.toString(),
      type: doc.type,
      status: doc.status,
      params: doc.params,
      result: doc.result,
      citations: doc.citations,
      errorMessage: doc.errorMessage,
      provider: doc.provider,
      model: doc.model,
      inputTokens: doc.inputTokens,
      outputTokens: doc.outputTokens,
      costCents: doc.costCents,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateAiJobDto): Partial<AiJobDocument> {
    return {
      tenantId,
      userId: data.userId,
      type: data.type,
      status: AiJobStatus.PENDING,
      params: data.params ?? {},
      provider: data.provider ?? 'none',
    };
  }

  protected toUpdateDoc(data: Partial<AiJobDomain>): Partial<AiJobDocument> {
    const out: Partial<AiJobDocument> = {};
    if (data.status !== undefined) out.status = data.status;
    if (data.result !== undefined) out.result = data.result;
    if (data.errorMessage !== undefined) out.errorMessage = data.errorMessage;
    if (data.completedAt !== undefined) out.completedAt = data.completedAt;
    if (data.inputTokens !== undefined) out.inputTokens = data.inputTokens;
    if (data.outputTokens !== undefined) out.outputTokens = data.outputTokens;
    if (data.costCents !== undefined) out.costCents = data.costCents;
    if (data.citations !== undefined) out.citations = data.citations;
    return out;
  }

  async findByUser(
    tenantId: string,
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<AiJobDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const [docs, totalItems] = await Promise.all([
      this.model.find({ tenantId, userId }).sort({ createdAt: -1 }).skip(skip).limit(perPage).exec(),
      this.model.countDocuments({ tenantId, userId }).exec(),
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
