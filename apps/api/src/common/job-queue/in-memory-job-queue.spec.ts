import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryJobQueue } from './in-memory-job-queue';
import { IJobProcessor, JobStatus } from '@constructtrack/types';

describe('InMemoryJobQueue', () => {
  let queue: InMemoryJobQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new InMemoryJobQueue();
  });

  describe('registerProcessor', () => {
    it('registers a processor for a job type', () => {
      const processor: IJobProcessor = {
        jobType: 'test.job',
        process: vi.fn().mockResolvedValue({ success: true }),
      };

      queue.registerProcessor(processor);

      // Enqueuing should not throw
      expect(async () => {
        await queue.enqueue('test.job', { key: 'value' });
      }).not.toThrow();
    });
  });

  describe('enqueue', () => {
    it('creates and executes a job synchronously', async () => {
      const processor: IJobProcessor = {
        jobType: 'report.generate',
        process: vi.fn().mockResolvedValue({ success: true, data: { url: 'test.json' } }),
      };
      queue.registerProcessor(processor);

      const job = await queue.enqueue('report.generate', { runId: 'run-1', tenantId: 't-1' });

      expect(job.id).toMatch(/^job_\d+_\d+$/);
      expect(job.type).toBe('report.generate');
      expect(job.status).toBe(JobStatus.SUCCEEDED);
      expect(job.payload).toEqual({ runId: 'run-1', tenantId: 't-1' });
      expect(job.result).toEqual({ success: true, data: { url: 'test.json' } });
      expect(job.startedAt).toBeInstanceOf(Date);
      expect(job.completedAt).toBeInstanceOf(Date);
      expect(processor.process).toHaveBeenCalledWith({ runId: 'run-1', tenantId: 't-1' });
    });

    it('marks job as FAILED when processor throws', async () => {
      const processor: IJobProcessor = {
        jobType: 'failing.job',
        process: vi.fn().mockRejectedValue(new Error('Something went wrong')),
      };
      queue.registerProcessor(processor);

      const job = await queue.enqueue('failing.job', { key: 'val' });

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.result).toEqual({ success: false, error: 'Something went wrong' });
    });

    it('marks job as FAILED when processor returns success: false', async () => {
      const processor: IJobProcessor = {
        jobType: 'partial.fail',
        process: vi.fn().mockResolvedValue({ success: false, error: 'Partial failure' }),
      };
      queue.registerProcessor(processor);

      const job = await queue.enqueue('partial.fail', {});

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.result?.error).toBe('Partial failure');
    });

    it('throws when no processor is registered for the job type', async () => {
      await expect(
        queue.enqueue('unknown.type', { key: 'val' }),
      ).rejects.toThrow('No processor registered for job type: unknown.type');
    });
  });

  describe('getJob', () => {
    it('returns the job after enqueueing', async () => {
      const processor: IJobProcessor = {
        jobType: 'tracked.job',
        process: vi.fn().mockResolvedValue({ success: true }),
      };
      queue.registerProcessor(processor);

      const enqueued = await queue.enqueue('tracked.job', { x: 1 });
      const fetched = await queue.getJob(enqueued.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(enqueued.id);
      expect(fetched!.status).toBe(JobStatus.SUCCEEDED);
    });

    it('returns null for unknown job id', async () => {
      const fetched = await queue.getJob('nonexistent');
      expect(fetched).toBeNull();
    });
  });

  describe('job lifecycle', () => {
    it('transitions through PENDING → PROCESSING → SUCCEEDED', async () => {
      const statusOrder: string[] = [];
      const processor: IJobProcessor = {
        jobType: 'lifecycle.job',
        process: vi.fn().mockImplementation(async () => {
          statusOrder.push('processing');
          return { success: true };
        }),
      };
      queue.registerProcessor(processor);

      const job = await queue.enqueue('lifecycle.job', {});

      expect(statusOrder).toEqual(['processing']);
      expect(job.status).toBe(JobStatus.SUCCEEDED);
      expect(job.startedAt).toBeDefined();
      expect(job.completedAt).toBeDefined();
    });

    it('generates unique ids for each job', async () => {
      const processor: IJobProcessor = {
        jobType: 'unique.job',
        process: vi.fn().mockResolvedValue({ success: true }),
      };
      queue.registerProcessor(processor);

      const job1 = await queue.enqueue('unique.job', {});
      const job2 = await queue.enqueue('unique.job', {});

      expect(job1.id).not.toBe(job2.id);
    });
  });
});
