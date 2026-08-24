import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiJobRepository } from './repositories/ai-job.repository';
import { AiFeedbackRepository } from './repositories/ai-feedback.repository';
import { InventoryService } from '../inventory/inventory.service';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { AuthContext } from '../../common/authorization/authorization.types';
import { Role, AiJobStatus, AiJobType, AiCompletionResponse } from '@constructtrack/types';

describe('AiService', () => {
  let service: AiService;

  const auth: AuthContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: Role.PROJECT_MANAGER,
  };

  const mockResponse: AiCompletionResponse = {
    content: 'Here is the answer.',
    provider: 'none',
    model: 'none',
    inputTokens: 10,
    outputTokens: 20,
    costCents: 0,
  };

  const mockJobRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUser: vi.fn(),
    update: vi.fn(),
  };

  const mockFeedbackRepo = {
    create: vi.fn(),
  };

  const mockInventoryService = {
    sumCostCentsByProjectAndMonth: vi.fn().mockResolvedValue([
      { projectId: 'p1', monthKey: '2026-08', total: 500000 },
      { projectId: null, monthKey: '2026-07', total: 250000 },
    ]),
  };

  const mockProjectRepo = {
    find: vi.fn().mockResolvedValue({
      items: [
        { id: 'p1', name: 'Tower A', status: 'active', budgetCents: 10000000 },
      ],
    }),
  };

  const mockProvider = {
    complete: vi.fn().mockResolvedValue(mockResponse),
  };

  const mockConfigService = () => ({
    get: vi.fn((key: string) => {
      if (key === 'aiProvider') return 'none';
      if (key === 'aiMaxTokens') return 1000;
      if (key === 'aiRequestTimeoutMs') return 15000;
      return undefined;
    }),
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: AiJobRepository, useValue: mockJobRepo },
        { provide: AiFeedbackRepository, useValue: mockFeedbackRepo },
        { provide: 'AI_PROVIDER', useValue: mockProvider },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ProjectRepository, useValue: mockProjectRepo },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('query', () => {
    it('creates a job, calls provider, and returns the answer', async () => {
      mockJobRepo.create.mockResolvedValue({ id: 'job-1' });
      mockJobRepo.update.mockResolvedValue(undefined);

      const result = await service.query(auth, { question: 'What is at risk?' });

      expect(result.answer).toBe('Here is the answer.');
      expect(result.jobId).toBe('job-1');
      expect(mockJobRepo.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
        userId: 'user-1',
        type: 'query',
      }));
      expect(mockProvider.complete).toHaveBeenCalled();
      expect(mockJobRepo.update).toHaveBeenCalledWith('tenant-1', 'job-1', expect.objectContaining({
        status: AiJobStatus.SUCCEEDED,
      }));
    });

    it('grounds the query in real expense data (zero-padded month keys)', async () => {
      mockJobRepo.create.mockResolvedValue({ id: 'job-1' });
      mockJobRepo.update.mockResolvedValue(undefined);

      await service.query(auth, { question: 'can you summarize the expenses' });

      const request = mockProvider.complete.mock.calls[0][0];
      expect(request.groundingContext).toContain('ORGANIZATION FINANCIAL SNAPSHOT');
      expect(request.groundingContext).toContain('2026-08=500000');
      expect(request.groundingContext).toContain('Total material-purchase spend');
      expect(request.groundingContext).toContain('Tower A');
    });

    it('still answers when grounding data cannot be loaded', async () => {
      mockJobRepo.create.mockResolvedValue({ id: 'job-1' });
      mockJobRepo.update.mockResolvedValue(undefined);
      mockInventoryService.sumCostCentsByProjectAndMonth.mockRejectedValue(new Error('db down'));

      await service.query(auth, { question: 'test' });

      const request = mockProvider.complete.mock.calls[0][0];
      expect(request.groundingContext).toBe('');
      expect(mockJobRepo.update).toHaveBeenCalledWith('tenant-1', 'job-1', expect.objectContaining({
        status: AiJobStatus.SUCCEEDED,
      }));
    });

    it('returns error message when provider throws', async () => {
      mockJobRepo.create.mockResolvedValue({ id: 'job-1' });
      mockProvider.complete.mockRejectedValue(new Error('Provider unavailable'));

      const result = await service.query(auth, { question: 'test' });

      expect(result.answer).toContain('Provider unavailable');
      expect(mockJobRepo.update).toHaveBeenCalledWith('tenant-1', 'job-1', expect.objectContaining({
        status: AiJobStatus.FAILED,
      }));
    });
  });

  describe('submitJob', () => {
    it('creates and runs an async job', async () => {
      mockJobRepo.create.mockResolvedValue({ id: 'job-2' });
      mockJobRepo.update.mockResolvedValue(undefined);
      mockJobRepo.findById.mockResolvedValue({ id: 'job-2', status: AiJobStatus.SUCCEEDED, result: 'Draft report content' });

      const result = await service.submitJob(auth, { type: AiJobType.DRAFT_REPORT });

      expect(result.id).toBe('job-2');
      expect(mockJobRepo.create).toHaveBeenCalled();
    });
  });

  describe('findMyJobs', () => {
    it('returns paginated jobs', async () => {
      const paginated = { items: [{ id: 'job-1' }], page: 1, perPage: 20, totalItems: 1, totalPages: 1 };
      mockJobRepo.findByUser.mockResolvedValue(paginated);

      const result = await service.findMyJobs(auth, { page: 1, perPage: 20 });

      expect(result.items).toHaveLength(1);
      expect(mockJobRepo.findByUser).toHaveBeenCalledWith('tenant-1', 'user-1', { page: 1, perPage: 20 });
    });
  });

  describe('findJobById', () => {
    it('finds a job by id', async () => {
      mockJobRepo.findById.mockResolvedValue({ id: 'job-1', status: AiJobStatus.SUCCEEDED });

      const result = await service.findJobById(auth, 'job-1');

      expect(result.id).toBe('job-1');
    });

    it('throws when job not found', async () => {
      mockJobRepo.findById.mockResolvedValue(null);

      await expect(service.findJobById(auth, 'bad-id')).rejects.toThrow('AI job not found');
    });
  });

  describe('feedback', () => {
    it('records feedback', async () => {
      mockFeedbackRepo.create.mockResolvedValue({ id: 'fb-1', rating: 'up' });

      const result = await service.submitFeedback(auth, { messageId: 'msg-1', rating: 'up' });

      expect(result.id).toBe('fb-1');
      expect(mockFeedbackRepo.create).toHaveBeenCalled();
    });
  });
});
