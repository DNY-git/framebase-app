import { Injectable, Inject } from '@nestjs/common';
import { ReportStatus } from '@constructtrack/types';
import { ReportRunRepository } from '../../modules/reports/repositories/report-run.repository';
import { ReportTemplateRepository } from '../../modules/reports/repositories/report-template.repository';
import { IReportRunWriter, IReportTemplateReader } from './report.processor';

/**
 * Bridges the concrete Mongoose repositories to the abstract interfaces
 * used by ReportProcessor. Keeps the processor decoupled from Mongoose.
 */

@Injectable()
export class ReportRunWriterAdapter implements IReportRunWriter {
  constructor(
    @Inject(ReportRunRepository) private readonly runRepo: ReportRunRepository,
  ) {}

  async updateStatus(
    tenantId: string,
    runId: string,
    patch: {
      status: ReportStatus;
      resultUrl?: string;
      errorMessage?: string;
      completedAt?: Date;
    },
  ): Promise<void> {
    await this.runRepo.update(tenantId, runId, patch);
  }
}

@Injectable()
export class ReportTemplateReaderAdapter implements IReportTemplateReader {
  constructor(
    @Inject(ReportTemplateRepository) private readonly templateRepo: ReportTemplateRepository,
  ) {}

  async findById(tenantId: string, id: string) {
    return this.templateRepo.findById(tenantId, id);
  }
}
