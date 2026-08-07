import { Injectable, Logger } from '@nestjs/common';
import {
  IJobProcessor,
  JobPayload,
  JobResult,
  ReportStatus,
} from '@constructtrack/types';
import { ReportTemplateDomain } from '@constructtrack/types';

export interface ReportJobPayload extends JobPayload {
  runId: string;
  tenantId: string;
  templateId: string;
  params: Record<string, unknown>;
}

/**
 * Abstract interface for report run persistence.
 * Decouples the processor from Mongoose — enables testing without DB.
 */
export interface IReportRunWriter {
  updateStatus(
    tenantId: string,
    runId: string,
    patch: {
      status: ReportStatus;
      resultUrl?: string;
      errorMessage?: string;
      completedAt?: Date;
    },
  ): Promise<void>;
}

/**
 * Abstract interface for report template lookup.
 */
export interface IReportTemplateReader {
  findById(tenantId: string, id: string): Promise<ReportTemplateDomain | null>;
}

/**
 * Processes report generation jobs.
 *
 * Transitions a ReportRun through PENDING → GENERATING → SUCCEEDED|FAILED.
 * Currently executes synchronously. When a real queue is introduced,
 * this processor becomes a BullMQ worker without changing its interface.
 */
@Injectable()
export class ReportProcessor implements IJobProcessor<ReportJobPayload> {
  readonly jobType = 'report.generate';
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly runWriter: IReportRunWriter,
    private readonly templateReader: IReportTemplateReader,
  ) {}

  async process(payload: ReportJobPayload): Promise<JobResult> {
    const { runId, tenantId, templateId, params } = payload;

    this.logger.log(`Processing report run ${runId} for template ${templateId}`);

    // Transition to GENERATING
    await this.runWriter.updateStatus(tenantId, runId, {
      status: ReportStatus.GENERATING,
    });

    try {
      // Fetch the template to understand what to generate
      const template = await this.templateReader.findById(tenantId, templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Execute report generation based on template type
      const result = await this.generateReportContent(template.type, template.config, params);

      // Transition to SUCCEEDED
      await this.runWriter.updateStatus(tenantId, runId, {
        status: ReportStatus.SUCCEEDED,
        resultUrl: result.url,
        completedAt: new Date(),
      });

      this.logger.log(`Report run ${runId} completed successfully`);
      return { success: true, data: result };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Report run ${runId} failed: ${message}`);

      // Transition to FAILED
      await this.runWriter.updateStatus(tenantId, runId, {
        status: ReportStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });

      return { success: false, error: message };
    }
  }

  private async generateReportContent(
    type: string,
    config: Record<string, unknown>,
    params: Record<string, unknown>,
  ): Promise<{ url: string; data: unknown }> {
    // Lightweight in-process report generation.
    // Generates a JSON summary. When a real queue + storage arrives,
    // this can produce PDFs, CSVs, or upload to cloud storage.
    const reportData = {
      type,
      config,
      params,
      generatedAt: new Date().toISOString(),
      sections: this.buildSections(type, config, params),
    };

    // In-memory result — no file upload.
    // When storage is plugged in, this would return a cloud URL.
    return {
      url: `local://reports/${type}_${Date.now()}.json`,
      data: reportData,
    };
  }

  private buildSections(
    type: string,
    config: Record<string, unknown>,
    params: Record<string, unknown>,
  ): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];

    sections.push({
      title: 'Summary',
      content: `Report of type "${type}" generated with parameters: ${JSON.stringify(params)}`,
    });

    if (config.description) {
      sections.push({
        title: 'Description',
        content: String(config.description),
      });
    }

    return sections;
  }
}
