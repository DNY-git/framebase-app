import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportTemplate, ReportTemplateSchema } from '../../schemas/report-template.schema';
import { ReportRun, ReportRunSchema } from '../../schemas/report-run.schema';
import { ReportTemplateRepository } from './repositories/report-template.repository';
import { ReportRunRepository } from './repositories/report-run.repository';
import { AuditModule } from '../audit/audit.module';
import { JobQueueModule } from '../../common/job-queue/job-queue.module';
import { ReportProcessor } from '../../common/job-queue/report.processor';
import { ReportRunWriterAdapter, ReportTemplateReaderAdapter } from '../../common/job-queue/reports.adapters';
import { IJobQueue } from '@constructtrack/types';
import { Inject } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReportTemplate.name, schema: ReportTemplateSchema },
      { name: ReportRun.name, schema: ReportRunSchema },
    ]),
    AuditModule,
    JobQueueModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportTemplateRepository,
    ReportRunRepository,
    ReportRunWriterAdapter,
    ReportTemplateReaderAdapter,
    {
      provide: ReportProcessor,
      useFactory: (runWriter: ReportRunWriterAdapter, templateReader: ReportTemplateReaderAdapter) => {
        return new ReportProcessor(runWriter, templateReader);
      },
      inject: [ReportRunWriterAdapter, ReportTemplateReaderAdapter],
    },
  ],
  exports: [ReportsService],
})
export class ReportsModule implements OnModuleInit {
  constructor(
    @Inject('JOB_QUEUE') private readonly jobQueue: IJobQueue,
    private readonly reportProcessor: ReportProcessor,
  ) {}

  onModuleInit() {
    this.jobQueue.registerProcessor(this.reportProcessor);
  }
}
