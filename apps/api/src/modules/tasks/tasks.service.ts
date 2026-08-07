import {
  HttpStatus,
  Injectable,
  Inject,
} from '@nestjs/common';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { TaskRepository } from './repositories/task.repository';
import { TaskDependencyRepository } from './repositories/task-dependency.repository';
import { ProjectsService } from '../projects/projects.service';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { EquipmentService } from '../equipment/equipment.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuthContext } from '../../common/authorization/authorization.types';
import {
  TaskDomain,
  TaskDependencyDomain,
  TaskStatus,
  ProjectStatus,
  PaginationOptions,
  PaginatedResponse,
  TenantId,
  EquipmentUsageLogDomain,
  InventoryTransactionDomain,
  TransactionType,
} from '@constructtrack/types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const VALID_TASK_TRANSITIONS: ReadonlyMap<TaskStatus, ReadonlySet<TaskStatus>> = new Map([
  [TaskStatus.TODO, new Set([TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED])],
  [TaskStatus.IN_PROGRESS, new Set([TaskStatus.BLOCKED, TaskStatus.DONE, TaskStatus.CANCELLED])],
  [TaskStatus.BLOCKED, new Set([TaskStatus.IN_PROGRESS])],
  [TaskStatus.DONE, new Set([TaskStatus.IN_PROGRESS])], // Reopening allowed but audited
  [TaskStatus.CANCELLED, new Set<TaskStatus>()],
]);

@Injectable()
export class TasksService {
  constructor(
    @Inject(TaskRepository) private readonly taskRepo: TaskRepository,
    @Inject(TaskDependencyRepository) private readonly depRepo: TaskDependencyRepository,
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
    @Inject(AuthorizationService) private readonly authzService: AuthorizationService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(EquipmentService) private readonly equipmentService: EquipmentService,
    @Inject(InventoryService) private readonly inventoryService: InventoryService,
  ) {}

  async create(auth: AuthContext, projectId: string, data: CreateTaskDto): Promise<TaskDomain> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);

    await this.projectsService.findById(auth, projectId);
    
    // Assignee validation
    if (data.assigneeId) {
      await this.validateAssignee(auth, projectId, data.assigneeId);
    }

    const task = await this.taskRepo.create(auth.tenantId, {
      ...data,
      projectId,
      status: data.status || TaskStatus.TODO,
    });

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'task_created',
      entityType: 'task',
      entityId: task.id,
      after: task as unknown as Record<string, unknown>,
    });

    return task;
  }

  async find(
    auth: AuthContext,
    projectId: string,
    filter: Record<string, unknown>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<TaskDomain>> {
    await this.authzService.assertProjectAccess(auth, auth.tenantId, projectId);
    return this.taskRepo.findByProject(auth.tenantId, projectId, filter, options);
  }

  async findById(auth: AuthContext, projectId: string, id: string): Promise<TaskDomain> {
    await this.authzService.assertProjectAccess(auth, auth.tenantId, projectId);
    const task = await this.taskRepo.findById(auth.tenantId, id);
    if (!task || task.projectId !== projectId) {
      throw new DomainException(ErrorCode.TASK_NOT_FOUND, HttpStatus.NOT_FOUND, 'Task not found.');
    }
    return task;
  }

  async update(
    auth: AuthContext,
    projectId: string,
    id: string,
    data: UpdateTaskDto,
  ): Promise<TaskDomain> {
    const taskBefore = await this.findById(auth, projectId, id);
    
    // isCrew logic placeholder
    // const isCrew = auth.role === undefined; 
    // Actually, AuthorizationService doesn't expose role directly for project member check synchronously.
    // But we know 'crew' can only edit status/comment on *their own tasks*.
    // Manager/Admin/Engineer can edit everything.
    
    // We will do a generic check: try to assert project manager. If fail, check if user is assignee.
    let isManager = true;
    try {
      await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);
    } catch {
      isManager = false;
    }

    if (!isManager) {
      // Must be assignee
      if (taskBefore.assigneeId !== auth.userId) {
        throw new DomainException(ErrorCode.TASK_NOT_FOUND, HttpStatus.NOT_FOUND, 'Task not found.');
      }
      // Crew can only update status
      const allowedKeys = ['status'];
      const attemptKeys = Object.keys(data);
      if (attemptKeys.some(k => !allowedKeys.includes(k))) {
        throw new DomainException(ErrorCode.TASK_CREW_LIMITED, HttpStatus.BAD_REQUEST, 'Crew members can only update task status.');
      }
    }

    if (data.assigneeId && data.assigneeId !== taskBefore.assigneeId) {
      await this.validateAssignee(auth, projectId, data.assigneeId);
    }

    if (data.status && data.status !== taskBefore.status) {
      this.assertValidTransition(taskBefore.status, data.status);
      
      // If moving to IN_PROGRESS, check project status and dependencies
      if (data.status === TaskStatus.IN_PROGRESS) {
        const project = await this.projectsService.findById(auth, projectId);
        if (project.status === ProjectStatus.ON_HOLD) {
          throw new DomainException(ErrorCode.TASK_PROJECT_ON_HOLD, HttpStatus.BAD_REQUEST, 'Cannot start a task when project is on hold.');
        }

        const predecessors = await this.depRepo.findPredecessors(auth.tenantId, id);
        for (const dep of predecessors) {
          const predTask = await this.taskRepo.findById(auth.tenantId, dep.predecessorId);
          if (predTask && predTask.status !== TaskStatus.DONE && predTask.status !== TaskStatus.CANCELLED) {
            throw new DomainException(ErrorCode.TASK_PREDECESSOR_INCOMPLETE, HttpStatus.BAD_REQUEST, `Cannot start task: predecessor ${predTask.title} is not complete.`);
          }
        }
      }
    }

    const updated = await this.taskRepo.update(auth.tenantId, id, data);
    if (!updated) {
      throw new DomainException(ErrorCode.TASK_NOT_FOUND, HttpStatus.NOT_FOUND, 'Task not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'task_updated',
      entityType: 'task',
      entityId: id,
      before: taskBefore as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async delete(auth: AuthContext, projectId: string, id: string): Promise<void> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);
    const task = await this.findById(auth, projectId, id);

    // Delete dependencies where this is predecessor or successor
    const preds = await this.depRepo.findPredecessors(auth.tenantId, id);
    for (const d of preds) await this.depRepo.delete(auth.tenantId, d.predecessorId, d.successorId);
    
    const succs = await this.depRepo.findSuccessors(auth.tenantId, id);
    for (const d of succs) await this.depRepo.delete(auth.tenantId, d.predecessorId, d.successorId);

    const deleted = await this.taskRepo.delete(auth.tenantId, id);
    if (!deleted) throw new DomainException(ErrorCode.TASK_NOT_FOUND, HttpStatus.NOT_FOUND, 'Task not found.');

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'task_deleted',
      entityType: 'task',
      entityId: id,
      before: task as unknown as Record<string, unknown>,
    });
  }

  // -------------------------------------------------------------------------
  // Dependencies
  // -------------------------------------------------------------------------

  async addDependency(auth: AuthContext, projectId: string, successorId: string, predecessorId: string): Promise<TaskDependencyDomain> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);
    
    if (successorId === predecessorId) {
      throw new DomainException(ErrorCode.TASK_SELF_DEPENDENCY, HttpStatus.BAD_REQUEST, 'A task cannot depend on itself.');
    }

    await this.findById(auth, projectId, successorId);
    await this.findById(auth, projectId, predecessorId);

    const exists = await this.depRepo.exists(auth.tenantId, predecessorId, successorId);
    if (exists) {
      throw new DomainException(ErrorCode.TASK_DUPLICATE_DEPENDENCY, HttpStatus.CONFLICT, 'Dependency already exists.');
    }

    // Cycle detection via DFS
    const hasCycle = await this.detectCycle(auth.tenantId, projectId, predecessorId, successorId);
    if (hasCycle) {
      throw new DomainException(ErrorCode.TASK_CYCLE_DETECTED, HttpStatus.UNPROCESSABLE_ENTITY, 'Cycle detected: adding this dependency would create a circular reference.');
    }

    const dep = await this.depRepo.create({
      tenantId: auth.tenantId as string,
      projectId,
      predecessorId,
      successorId,
    });

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'task_dependency_added',
      entityType: 'task_dependency',
      entityId: dep.id,
      after: { predecessorId, successorId },
    });

    return dep;
  }

  async removeDependency(auth: AuthContext, projectId: string, successorId: string, predecessorId: string): Promise<void> {
    await this.authzService.assertProjectManager(auth, auth.tenantId, projectId);
    
    const deleted = await this.depRepo.delete(auth.tenantId, predecessorId, successorId);
    if (!deleted) {
      throw new DomainException(ErrorCode.TASK_DEPENDENCY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Dependency not found.');
    }

    this.auditService.record({
      tenantId: auth.tenantId as string,
      actorId: auth.userId,
      action: 'task_dependency_removed',
      entityType: 'task_dependency',
      entityId: `${predecessorId}-${successorId}`,
      before: { predecessorId, successorId },
    });
  }

  async getDependencies(auth: AuthContext, projectId: string, taskId: string) {
    await this.authzService.assertProjectAccess(auth, auth.tenantId, projectId);
    const [predecessors, successors] = await Promise.all([
      this.depRepo.findPredecessors(auth.tenantId, taskId),
      this.depRepo.findSuccessors(auth.tenantId, taskId),
    ]);
    return { predecessors, successors };
  }

  // -------------------------------------------------------------------------
  // Resource Consumption (T-205)
  // -------------------------------------------------------------------------

  async recordEquipmentUsage(
    auth: AuthContext,
    projectId: string,
    taskId: string,
    equipmentId: string,
    date: string,
    hoursUsed: number,
  ): Promise<EquipmentUsageLogDomain> {
    await this.findById(auth, projectId, taskId);
    return this.equipmentService.logUsage(auth, equipmentId, {
      date,
      hoursUsed,
      taskId,
    });
  }

  async getEquipmentUsage(
    auth: AuthContext,
    projectId: string,
    taskId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<EquipmentUsageLogDomain>> {
    await this.findById(auth, projectId, taskId);
    return this.equipmentService.getUsageLogsByTask(auth, taskId, options);
  }

  async recordMaterialConsumption(
    auth: AuthContext,
    projectId: string,
    taskId: string,
    materialId: string,
    quantity: number,
  ): Promise<InventoryTransactionDomain> {
    await this.findById(auth, projectId, taskId);
    return this.inventoryService.recordTransaction(auth, {
      type: TransactionType.CONSUME,
      quantity,
      materialId,
      taskId,
    });
  }

  async getMaterialConsumption(
    auth: AuthContext,
    projectId: string,
    taskId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    await this.findById(auth, projectId, taskId);
    return this.inventoryService.getTransactionsByTask(auth, taskId, options);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private assertValidTransition(from: TaskStatus, to: TaskStatus): void {
    const allowed = VALID_TASK_TRANSITIONS.get(from);
    if (!allowed || !allowed.has(to)) {
      throw new DomainException(ErrorCode.TASK_INVALID_STATUS_TRANSITION, HttpStatus.BAD_REQUEST, `Invalid status transition: '${from}' → '${to}'.`);
    }
  }

  private async validateAssignee(auth: AuthContext, projectId: string, assigneeId: string): Promise<void> {
    const members = await this.projectsService.listMembers(auth, projectId);
    if (!members.some(m => m.userId === assigneeId)) {
      throw new DomainException(ErrorCode.TASK_ASSIGNEE_NOT_MEMBER, HttpStatus.UNPROCESSABLE_ENTITY, 'Assignee must be a member of the project.');
    }
  }

  private async detectCycle(tenantId: TenantId, projectId: string, newPredId: string, newSuccId: string): Promise<boolean> {
    // We are adding newPredId -> newSuccId.
    // A cycle occurs if there is already a path from newSuccId to newPredId.
    // We run DFS starting from newSuccId. If we reach newPredId, we found a cycle.
    
    const visited = new Set<string>();
    const stack = [newSuccId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === newPredId) return true;
      
      if (!visited.has(current)) {
        visited.add(current);
        const successors = await this.depRepo.findSuccessors(tenantId, current);
        for (const s of successors) {
          if (!visited.has(s.successorId)) {
            stack.push(s.successorId);
          }
        }
      }
    }

    return false;
  }
}
