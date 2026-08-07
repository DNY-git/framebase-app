import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TaskRepository } from './repositories/task.repository';
import { TaskDependencyRepository } from './repositories/task-dependency.repository';
import { ProjectsService } from '../projects/projects.service';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { EquipmentService } from '../equipment/equipment.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuthContext } from '../../common/authorization/authorization.types';
import { TaskStatus, ProjectStatus, Role } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: typeof mockTaskRepo;
  let depRepo: typeof mockDepRepo;
  let projectsService: typeof mockProjectsService;
  let authzService: typeof mockAuthzService;
  let auditService: typeof mockAuditService;

  const auth: AuthContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: Role.PROJECT_MANAGER,
  };

  const mockTaskRepo = {
    create: vi.fn(),
    findByProject: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockDepRepo = {
    create: vi.fn(),
    delete: vi.fn(),
    findByProject: vi.fn(),
    findPredecessors: vi.fn(),
    findSuccessors: vi.fn(),
    exists: vi.fn(),
  };

  const mockProjectsService = {
    findById: vi.fn(),
    listMembers: vi.fn(),
  };

  const mockAuthzService = {
    assertProjectAccess: vi.fn(),
    assertProjectManager: vi.fn(),
  };

  const mockAuditService = {
    record: vi.fn(),
  };

  const mockEquipmentService = {
    logUsage: vi.fn(),
    getUsageLogsByTask: vi.fn(),
  };

  const mockInventoryService = {
    recordTransaction: vi.fn(),
    getTransactionsByTask: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TaskRepository, useValue: mockTaskRepo },
        { provide: TaskDependencyRepository, useValue: mockDepRepo },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: AuthorizationService, useValue: mockAuthzService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepo = module.get(TaskRepository);
    depRepo = module.get(TaskDependencyRepository);
    projectsService = module.get(ProjectsService);
    authzService = module.get(AuthorizationService);
    auditService = module.get(AuditService);
  });

  describe('create', () => {
    it('creates a task successfully', async () => {
      projectsService.findById.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.PLANNING });
      taskRepo.create.mockResolvedValue({ id: 'task-1', title: 'Test Task', projectId: 'proj-1', tenantId: 'tenant-1' });

      const result = await service.create(auth, 'proj-1', { title: 'Test Task' });

      expect(result.id).toBe('task-1');
      expect(taskRepo.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ title: 'Test Task' }));
      expect(auditService.record).toHaveBeenCalled();
      expect(authzService.assertProjectManager).toHaveBeenCalled();
    });

    it('validates assignee is a project member', async () => {
      projectsService.findById.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.PLANNING });
      projectsService.listMembers.mockResolvedValue([{ userId: 'user-2' }]); // user-3 is not a member

      await expect(service.create(auth, 'proj-1', { title: 'Test Task', assigneeId: 'user-3' }))
        .rejects.toThrow(DomainException);
    });
  });

  describe('update', () => {
    it('allows manager to update any task', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1', status: TaskStatus.TODO, assigneeId: 'user-2' });
      taskRepo.update.mockResolvedValue({ id: 'task-1', title: 'New Title', status: TaskStatus.TODO });
      authzService.assertProjectManager.mockResolvedValue(undefined);

      await service.update(auth, 'proj-1', 'task-1', { title: 'New Title' });
      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('allows assignee to update only status if not manager', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1', status: TaskStatus.TODO, assigneeId: 'user-1' });
      taskRepo.update.mockResolvedValue({ id: 'task-1', status: TaskStatus.IN_PROGRESS });
      authzService.assertProjectManager.mockRejectedValue(new Error('Forbidden'));

      projectsService.findById.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.ACTIVE });
      depRepo.findPredecessors.mockResolvedValue([]);

      await service.update(auth, 'proj-1', 'task-1', { status: TaskStatus.IN_PROGRESS });
      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('prevents assignee from updating title if not manager', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1', status: TaskStatus.TODO, assigneeId: 'user-1' });
      authzService.assertProjectManager.mockRejectedValue(new Error('Forbidden'));

      await expect(service.update(auth, 'proj-1', 'task-1', { title: 'Hacked Title' }))
        .rejects.toThrow(DomainException);
    });

    it('prevents advancing to IN_PROGRESS if project is ON_HOLD', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1', status: TaskStatus.TODO, assigneeId: 'user-1' });
      authzService.assertProjectManager.mockResolvedValue(undefined);
      projectsService.findById.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.ON_HOLD });

      await expect(service.update(auth, 'proj-1', 'task-1', { status: TaskStatus.IN_PROGRESS }))
        .rejects.toThrow(DomainException);
    });

    it('prevents advancing to IN_PROGRESS if predecessor is not done', async () => {
      taskRepo.findById.mockImplementation((tenantId: string, id: string) => {
        if (id === 'task-1') return Promise.resolve({ id: 'task-1', projectId: 'proj-1', status: TaskStatus.TODO });
        if (id === 'pred-1') return Promise.resolve({ id: 'pred-1', projectId: 'proj-1', status: TaskStatus.IN_PROGRESS });
      });
      authzService.assertProjectManager.mockResolvedValue(undefined);
      projectsService.findById.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.ACTIVE });
      depRepo.findPredecessors.mockResolvedValue([{ predecessorId: 'pred-1', successorId: 'task-1' }]);

      await expect(service.update(auth, 'proj-1', 'task-1', { status: TaskStatus.IN_PROGRESS }))
        .rejects.toThrow(/predecessor.*is not complete/);
    });
  });

  describe('dependencies and cycle detection', () => {
    it('adds a dependency successfully', async () => {
      taskRepo.findById.mockImplementation((_t, id) => Promise.resolve({ id, projectId: 'proj-1' }));
      depRepo.exists.mockResolvedValue(false);
      depRepo.findSuccessors.mockResolvedValue([]);
      depRepo.create.mockResolvedValue({ id: 'dep-1' });

      const result = await service.addDependency(auth, 'proj-1', 'succ-1', 'pred-1');
      expect(result.id).toBe('dep-1');
      expect(depRepo.create).toHaveBeenCalledWith(expect.objectContaining({ predecessorId: 'pred-1', successorId: 'succ-1' }));
    });

    it('detects a cycle: A -> B -> C -> A', async () => {
      taskRepo.findById.mockImplementation((_t, id) => Promise.resolve({ id, projectId: 'proj-1' }));
      depRepo.exists.mockResolvedValue(false);

      depRepo.findSuccessors.mockImplementation((tenantId: string, current: string) => {
        if (current === 'A') return Promise.resolve([{ successorId: 'B' }]);
        if (current === 'B') return Promise.resolve([{ successorId: 'C' }]);
        return Promise.resolve([]);
      });

      await expect(service.addDependency(auth, 'proj-1', 'A', 'C'))
        .rejects.toThrow(DomainException);
    });
  });

  describe('resource consumption (T-205)', () => {
    it('records equipment usage against a task', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });
      mockEquipmentService.logUsage.mockResolvedValue({ id: 'ul-1', taskId: 'task-1', equipmentId: 'eq-1', hoursUsed: 4 });

      const result = await service.recordEquipmentUsage(auth, 'proj-1', 'task-1', 'eq-1', '2026-07-09', 4);
      expect(result.id).toBe('ul-1');
      expect(mockEquipmentService.logUsage).toHaveBeenCalledWith(auth, 'eq-1', { date: '2026-07-09', hoursUsed: 4, taskId: 'task-1' });
    });

    it('gets equipment usage for a task', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });
      const paginated = { items: [{ id: 'ul-1' }], page: 1, perPage: 20, totalItems: 1, totalPages: 1 };
      mockEquipmentService.getUsageLogsByTask.mockResolvedValue(paginated);

      const result = await service.getEquipmentUsage(auth, 'proj-1', 'task-1', { page: 1, perPage: 20 });
      expect(result.items).toHaveLength(1);
    });

    it('records material consumption against a task', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });
      mockInventoryService.recordTransaction.mockResolvedValue({ id: 'tx-1', taskId: 'task-1', type: 'consume', quantity: -5 });

      const result = await service.recordMaterialConsumption(auth, 'proj-1', 'task-1', 'mat-1', 5);
      expect(result.id).toBe('tx-1');
      expect(mockInventoryService.recordTransaction).toHaveBeenCalledWith(auth, {
        type: 'consume',
        quantity: 5,
        materialId: 'mat-1',
        taskId: 'task-1',
      });
    });

    it('gets material consumption for a task', async () => {
      taskRepo.findById.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });
      const paginated = { items: [{ id: 'tx-1' }], page: 1, perPage: 20, totalItems: 1, totalPages: 1 };
      mockInventoryService.getTransactionsByTask.mockResolvedValue(paginated);

      const result = await service.getMaterialConsumption(auth, 'proj-1', 'task-1', { page: 1, perPage: 20 });
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFound if task does not exist when recording equipment usage', async () => {
      taskRepo.findById.mockResolvedValue(null);
      await expect(service.recordEquipmentUsage(auth, 'proj-1', 'bad-task', 'eq-1', '2026-07-09', 1))
        .rejects.toThrow('Task not found.');
    });
  });
});
