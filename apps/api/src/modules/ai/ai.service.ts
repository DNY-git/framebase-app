import { HttpStatus, Injectable, Inject, Optional } from '@nestjs/common';
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
  ProjectStatus,
} from '@constructtrack/types';
import { QueryDto } from './dto/query.dto';
import { SubmitJobDto } from './dto/submit-job.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { InventoryService } from '../inventory/inventory.service';
import { ProjectRepository } from '../projects/repositories/project.repository';
import type { AppConfig } from '../../config/configuration';

const GROUNDING_MONTHS = 6;
const MAX_PROJECTS_IN_CONTEXT = 12;

/** Zero-padded YYYY-MM key matching the Mongo $dateToString aggregation format. */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class AiService {
  constructor(
    @Inject(AiJobRepository) private readonly jobRepo: AiJobRepository,
    @Inject(AiFeedbackRepository) private readonly feedbackRepo: AiFeedbackRepository,
    @Inject('AI_PROVIDER') private readonly aiProvider: IAIProvider,
    @Inject(ConfigService) private readonly config: ConfigService<AppConfig>,
    // Optional so existing unit tests without inventory/projects providers still compile.
    @Optional() @Inject(InventoryService) private readonly inventoryService?: InventoryService,
    @Optional() @Inject(ProjectRepository) private readonly projectRepo?: ProjectRepository,
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

    const groundingContext = await this.buildGroundingContext(auth);

    const request: AiCompletionRequest = {
      systemPrompt:
        'You are a helpful construction project assistant. Answer questions based only on the provided context. ' +
        'The context contains real financial data from the user\'s organization (amounts are in cents). ' +
        'When asked to summarize or analyze expenses, use exactly these numbers and present them in a readable form.',
      userPrompt: dto.question,
      groundingContext,
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

  // ====== Grounding ======

  /**
   * Build a compact grounding snapshot from REAL application data:
   * project budgets plus actual material-purchase spend for the last
   * months. No fabricated numbers — when the database is empty the
   * context says so explicitly.
   */
  private async buildGroundingContext(auth: AuthContext): Promise<string> {
    if (!this.inventoryService || !this.projectRepo) return '';

    try {
      const now = new Date();
      const trendStart = new Date(now.getFullYear(), now.getMonth() - (GROUNDING_MONTHS - 1), 1);
      const [spendRows, projectsResult] = await Promise.all([
        this.inventoryService.sumCostCentsByProjectAndMonth(auth, { since: trendStart }),
        this.projectRepo.find(auth.tenantId, {}, { page: 1, perPage: 200 }),
      ]);
      const projects = projectsResult.items;

      const totalSpent = spendRows.reduce((sum, r) => sum + r.total, 0);
      const spentByMonth = new Map<string, number>();
      for (const r of spendRows) {
        spentByMonth.set(r.monthKey, (spentByMonth.get(r.monthKey) ?? 0) + r.total);
      }

      const monthLines: string[] = [];
      for (let i = GROUNDING_MONTHS - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLines.push(`${monthKey(d)}=${spentByMonth.get(monthKey(d)) ?? 0}`);
      }

      const budgetedProjects = projects.filter((p) => (p.budgetCents ?? 0) > 0);
      const totalBudget = budgetedProjects.reduce((sum, p) => sum + (p.budgetCents ?? 0), 0);
      const activeBudgeted = budgetedProjects
        .filter((p) => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.ON_HOLD)
        .slice(0, MAX_PROJECTS_IN_CONTEXT)
        .map((p) => `- ${p.name} (${p.status}): budget ${p.budgetCents} cents`)
        .join('\n');

      const lines = [
        '=== ORGANIZATION FINANCIAL SNAPSHOT (real application data; all amounts in cents) ===',
        `Total project budget: ${totalBudget} cents`,
        `Total material-purchase spend over last ${GROUNDING_MONTHS} months: ${totalSpent} cents`,
        `Monthly spend: ${monthLines.join(', ')}`,
        budgetedProjects.length > 0
          ? `Projects with budgets:\n${activeBudgeted}`
          : 'Projects with budgets: none recorded yet',
        totalSpent === 0 ? 'Note: no purchase transactions were recorded in this period.' : '',
      ];

      return lines.filter(Boolean).join('\n');
    } catch {
      // Grounding is best-effort; never fail the whole query because of it.
      return '';
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

    const groundingContext = await this.buildGroundingContext(auth);

    const request: AiCompletionRequest = {
      systemPrompt:
        dto.type === 'summarize'
          ? 'You are a construction project assistant. Summarize the provided real financial data clearly and concisely.'
          : 'You are a construction project assistant. Generate a well-structured output based on the provided context.',
      userPrompt:
        dto.type === 'summarize'
          ? 'Summarize our current expenses and how they compare to the project budgets, using the data provided.'
          : 'Please draft a report based on the provided parameters.',
      groundingContext,
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
