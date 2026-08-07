import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { AiJobRepository } from './repositories/ai-job.repository';
import { AiFeedbackRepository } from './repositories/ai-feedback.repository';
import { IAIProvider } from './providers/ai-provider.interface';
import { AuthContext } from '../../common/authorization/authorization.types';
import {
  AiJobDomain,
  AiFeedbackDomain,
  AiJobStatus,
  AiJobType,
  PaginationOptions,
  PaginatedResponse,
  AiCompletionRequest,
} from '@constructtrack/types';
import { QueryDto } from './dto/query.dto';
import { SubmitJobDto } from './dto/submit-job.dto';
import { FeedbackDto } from './dto/feedback.dto';
import type { AppConfig } from '../../config/configuration';

@Injectable()
export class AiService {
  constructor(
    @Inject(AiJobRepository) private readonly jobRepo: AiJobRepository,
    @Inject(AiFeedbackRepository) private readonly feedbackRepo: AiFeedbackRepository,
    @Inject('AI_PROVIDER') private readonly aiProvider: IAIProvider,
    @Inject(ConfigService) private readonly config: ConfigService<AppConfig>,
  ) {}

  // ====== Query ======

  async query(auth: AuthContext, dto: QueryDto): Promise<{ answer: string; citations?: AiJobDomain['citations']; jobId?: string }> {
    const job = await this.jobRepo.create(auth.tenantId, {
      userId: auth.userId,
      type: AiJobType.QUERY,
      params: { question: dto.question },
      provider: this.config.get('aiProvider', { infer: true }) ?? 'none',
    });

    const maxTokens = this.config.get('aiMaxTokens', { infer: true }) ?? 1000;
    const timeout = this.config.get('aiRequestTimeoutMs', { infer: true }) ?? 15000;

    const request: AiCompletionRequest = {
      systemPrompt: 'You are a helpful construction project assistant. Answer questions based only on the provided context.',
      userPrompt: dto.question,
      groundingContext: '',
      maxTokens,
      timeoutMs: timeout,
    };

    try {
      const response = await this.aiProvider.complete(request);

      await this.jobRepo.update(auth.tenantId, job.id, {
        status: AiJobStatus.SUCCEEDED,
        result: response.content,
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costCents: response.costCents,
        completedAt: new Date(),
      });

      return { answer: response.content, jobId: job.id };
    } catch (err) {
      const message = (err as Error).message;
      await this.jobRepo.update(auth.tenantId, job.id, {
        status: AiJobStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });
      return { answer: `The assistant encountered an error: ${message}. Please try again.`, jobId: job.id };
    }
  }

  // ====== Async Jobs ======

  async submitJob(auth: AuthContext, dto: SubmitJobDto): Promise<AiJobDomain> {
    const job = await this.jobRepo.create(auth.tenantId, {
      userId: auth.userId,
      type: dto.type,
      params: { ...dto.params, projectId: dto.projectId },
      provider: this.config.get('aiProvider', { infer: true }) ?? 'none',
    });

    const maxTokens = this.config.get('aiMaxTokens', { infer: true }) ?? 2000;
    const timeout = this.config.get('aiRequestTimeoutMs', { infer: true }) ?? 30000;

    const request: AiCompletionRequest = {
      systemPrompt: 'You are a construction project assistant. Generate a well-structured output based on the provided context.',
      userPrompt: dto.type === 'summarize' ? 'Please summarize the project status.' : 'Please draft a report based on the provided parameters.',
      groundingContext: '',
      maxTokens,
      timeoutMs: timeout,
    };

    try {
      const response = await this.aiProvider.complete(request);

      await this.jobRepo.update(auth.tenantId, job.id, {
        status: AiJobStatus.SUCCEEDED,
        result: response.content,
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costCents: response.costCents,
        completedAt: new Date(),
      });
    } catch (err) {
      await this.jobRepo.update(auth.tenantId, job.id, {
        status: AiJobStatus.FAILED,
        errorMessage: (err as Error).message,
        completedAt: new Date(),
      });
    }

    return this.jobRepo.findById(auth.tenantId, job.id) as Promise<AiJobDomain>;
  }

  async findMyJobs(
    auth: AuthContext,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<AiJobDomain>> {
    return this.jobRepo.findByUser(auth.tenantId, auth.userId, options);
  }

  async findJobById(auth: AuthContext, id: string): Promise<AiJobDomain> {
    const job = await this.jobRepo.findById(auth.tenantId, id);
    if (!job) throw new DomainException(ErrorCode.AI_JOB_NOT_FOUND, HttpStatus.NOT_FOUND, 'AI job not found');
    return job;
  }

  // ====== Feedback ======

  async submitFeedback(auth: AuthContext, dto: FeedbackDto): Promise<AiFeedbackDomain> {
    return this.feedbackRepo.create(auth.tenantId, { ...dto });
  }
}
