import { Module, Provider } from '@nestjs/common';
import { InMemoryJobQueue } from './in-memory-job-queue';

/**
 * Job queue module — provides the queue implementation.
 *
 * Default: InMemoryJobQueue (synchronous, no Redis).
 * To swap to BullMQ: implement IJobQueue, replace the provider, and
 * remove InMemoryJobQueue from this module.
 *
 * Processors are registered by the modules that own them
 * (e.g., ReportsModule registers ReportProcessor).
 */
const JobQueueProvider: Provider = {
  provide: 'JOB_QUEUE',
  useClass: InMemoryJobQueue,
};

@Module({
  providers: [JobQueueProvider],
  exports: ['JOB_QUEUE'],
})
export class JobQueueModule {}
