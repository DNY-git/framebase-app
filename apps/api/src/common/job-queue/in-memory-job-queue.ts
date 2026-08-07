import { Injectable, Logger } from '@nestjs/common';
import {
  IJobQueue,
  IJobProcessor,
  Job,
  JobPayload,
  JobStatus,
  JobResult,
} from '@constructtrack/types';

/**
 * Lightweight in-memory job queue.
 *
 * Executes jobs synchronously within the request cycle.
 * No Redis, no external dependencies. Designed to be swapped out
 * for BullMQ or another queue backend via the IJobQueue interface.
 *
 * Extension point: implement IJobQueue and replace this provider
 * in JobQueueModule when Redis becomes available.
 */
@Injectable()
export class InMemoryJobQueue implements IJobQueue {
  private readonly logger = new Logger(InMemoryJobQueue.name);
  private readonly processors = new Map<string, IJobProcessor>();
  private readonly jobs = new Map<string, Job>();

  private counter = 0;

  registerProcessor(processor: IJobProcessor): void {
    this.processors.set(processor.jobType, processor);
    this.logger.log(`Registered processor for job type: ${processor.jobType}`);
  }

  async enqueue<TPayload extends JobPayload>(
    type: string,
    payload: TPayload,
  ): Promise<Job<TPayload>> {
    const processor = this.processors.get(type);
    if (!processor) {
      throw new Error(`No processor registered for job type: ${type}`);
    }

    const id = this.generateId();
    const job: Job<TPayload> = {
      id,
      type,
      status: JobStatus.PENDING,
      payload,
      createdAt: new Date(),
    };

    this.jobs.set(id, job as Job);
    this.logger.debug(`Enqueued job ${id} of type ${type}`);

    // Execute synchronously — swap for async dispatch when using a real queue.
    await this.executeJob(id, processor);

    return job;
  }

  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  private async executeJob(
    id: string,
    processor: IJobProcessor,
  ): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();

    try {
      const result: JobResult = await processor.process(job.payload);
      job.status = result.success ? JobStatus.SUCCEEDED : JobStatus.FAILED;
      job.result = result;
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Job ${id} failed: ${message}`);
      job.status = JobStatus.FAILED;
      job.result = { success: false, error: message };
    } finally {
      job.completedAt = new Date();
    }
  }

  private generateId(): string {
    this.counter += 1;
    return `job_${Date.now()}_${this.counter}`;
  }
}
