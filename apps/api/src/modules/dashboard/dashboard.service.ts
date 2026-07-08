import { Injectable, Inject } from '@nestjs/common';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { TaskRepository } from '../tasks/repositories/task.repository';
import { AuthContext } from '../../common/authorization/authorization.types';
import { DashboardOverview, ProjectStatus, TaskStatus, TaskPriority } from '@constructtrack/types';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(AuthorizationService) private readonly authzService: AuthorizationService,
    @Inject(ProjectRepository) private readonly projectRepo: ProjectRepository,
    @Inject(TaskRepository) private readonly taskRepo: TaskRepository,
  ) {}

  async getOverview(auth: AuthContext): Promise<DashboardOverview> {
    const accessibleProjectIds = await this.authzService.accessibleProjectIds(
      auth.tenantId,
      auth.userId,
    );

    const projectFilter: Record<string, unknown> = {};
    if (accessibleProjectIds) {
      projectFilter._id = { $in: accessibleProjectIds };
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [activeProjects, onHoldProjects, completingSoonProjects] = await Promise.all([
      this.projectRepo.count(auth.tenantId, { ...projectFilter, status: ProjectStatus.ACTIVE }),
      this.projectRepo.count(auth.tenantId, { ...projectFilter, status: ProjectStatus.ON_HOLD }),
      this.projectRepo.count(auth.tenantId, {
        ...projectFilter,
        status: ProjectStatus.ACTIVE,
        endDate: { $lte: thirtyDaysFromNow },
      }),
    ]);

    const taskProjectFilter: Record<string, unknown> = {};
    if (accessibleProjectIds) {
      taskProjectFilter.projectId = { $in: accessibleProjectIds };
    }

    const [tasksAtRisk, mineTodayTasks] = await Promise.all([
      this.taskRepo.count(auth.tenantId, {
        ...taskProjectFilter,
        status: { $in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED] },
        $or: [
          { priority: { $in: [TaskPriority.HIGH, TaskPriority.CRITICAL] } },
          { dueDate: { $lt: now } },
        ],
      }),
      this.taskRepo.count(auth.tenantId, {
        ...taskProjectFilter,
        assigneeId: auth.userId,
        status: { $nin: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        dueDate: { $lte: endOfToday },
      }),
    ]);

    return {
      projects: {
        active: activeProjects,
        onHold: onHoldProjects,
        completingSoon: completingSoonProjects,
      },
      tasks: {
        atRisk: tasksAtRisk,
        mineToday: mineTodayTasks,
      },
    };
  }
}
