import { HttpStatus, Injectable, Inject, Logger } from '@nestjs/common';
import { ErrorCode, Role, IJobQueue } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { ReportTemplateRepository } from './repositories/report-template.repository';
import { ReportRunRepository } from './repositories/report-run.repository';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/authorization/authorization.types';
import { ReportTemplateDomain, ReportRunDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { isTenantAdmin } from '../../common/authorization/permissions';
import { ReportJobPayload } from '../../common/job-queue/report.processor';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(ReportTemplateRepository) private readonly templateRepo: ReportTemplateRepository,
    @Inject(ReportRunRepository) private readonly runRepo: ReportRunRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject('JOB_QUEUE') private readonly jobQueue: IJobQueue,
  ) {}

  private assertManager(auth: AuthContext) {
    if (!isTenantAdmin(auth.role) && auth.role !== Role.PROJECT_MANAGER) {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Only Project Managers or Admins can manage report templates.');
    }
  }

  // ====== Templates ======

  async createTemplate(auth: AuthContext, dto: CreateReportTemplateDto): Promise<ReportTemplateDomain> {
    this.assertManager(auth);
    const template = await this.templateRepo.create(auth.tenantId, { ...dto, createdBy: auth.userId } as CreateReportTemplateDto);
    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'report_template.create',
      entityType: 'report_template',
      entityId: template.id,
      after: template as unknown as Record<string, unknown>,
    });
    return template;
  }

  async findTemplates(auth: AuthContext, options: PaginationOptions): Promise<PaginatedResponse<ReportTemplateDomain>> {
    return this.templateRepo.find(auth.tenantId, {}, options);
  }

  async findTemplateById(auth: AuthContext, id: string): Promise<ReportTemplateDomain> {
    const template = await this.templateRepo.findById(auth.tenantId, id);
    if (!template) throw new DomainException(ErrorCode.REPORT_TEMPLATE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Report template not found');
    return template;
  }

  // ====== Runs ======

  async generateReport(auth: AuthContext, dto: GenerateReportDto): Promise<ReportRunDomain> {
    const template = await this.templateRepo.findById(auth.tenantId, dto.templateId);
    if (!template) throw new DomainException(ErrorCode.REPORT_TEMPLATE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Report template not found');

    const run = await this.runRepo.create(auth.tenantId, { ...dto, requestedBy: auth.userId } as unknown as Partial<GenerateReportDto>);

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'report_run.create',
      entityType: 'report_run',
      entityId: run.id,
      after: run as unknown as Record<string, unknown>,
    });

    // Submit to job queue for processing.
    // InMemoryJobQueue executes synchronously; a BullMQ implementation
    // would dispatch to a background worker without changing this code.
    try {
      await this.jobQueue.enqueue<ReportJobPayload>('report.generate', {
        runId: run.id,
        tenantId: auth.tenantId,
        templateId: dto.templateId,
        params: dto.params ?? {},
      });
    } catch (err) {
      this.logger.error(`Failed to enqueue report job: ${(err as Error).message}`);
    }

    // Re-fetch to get the updated status (GENERATING, SUCCEEDED, or FAILED)
    const updatedRun = await this.runRepo.findById(auth.tenantId, run.id);
    return updatedRun ?? run;
  }

  async findRuns(
    auth: AuthContext,
    options: PaginationOptions,
    filter?: Record<string, unknown>,
  ): Promise<PaginatedResponse<ReportRunDomain>> {
    return this.runRepo.findByTenant(auth.tenantId, options, filter);
  }

  async findRunById(auth: AuthContext, id: string): Promise<ReportRunDomain> {
    const run = await this.runRepo.findById(auth.tenantId, id);
    if (!run) throw new DomainException(ErrorCode.REPORT_RUN_NOT_FOUND, HttpStatus.NOT_FOUND, 'Report run not found');
    return run;
  }
}
