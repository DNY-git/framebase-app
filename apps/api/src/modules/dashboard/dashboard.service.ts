import { Injectable, Inject } from '@nestjs/common';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { TaskRepository } from '../tasks/repositories/task.repository';
import { EquipmentService } from '../equipment/equipment.service';
import { EquipmentReportService } from '../equipment/equipment-report.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuthContext } from '../../common/authorization/authorization.types';
import { DashboardOverview, ProjectStatus, TaskStatus, TaskPriority, EquipmentStatus } from '@constructtrack/types';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(AuthorizationService) private readonly authzService: AuthorizationService,
    @Inject(ProjectRepository) private readonly projectRepo: ProjectRepository,
    @Inject(TaskRepository) private readonly taskRepo: TaskRepository,
    @Inject(EquipmentService) private readonly equipmentService: EquipmentService,
    @Inject(EquipmentReportService) private readonly equipmentReportService: EquipmentReportService,
    @Inject(InventoryService) private readonly inventoryService: InventoryService,
  ) {}

  async getOverview(auth: AuthContext): Promise<DashboardOverview> {
    const accessibleProjectIds = await this.authzService.accessibleProjectIds(
      auth.tenantId,
      auth.userId,
      auth.role,
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

    const taskProjectFilter: Record<string, unknown> = {};
    if (accessibleProjectIds) {
      taskProjectFilter.projectId = { $in: accessibleProjectIds };
    }

    const [
      activeProjects, onHoldProjects, completingSoonProjects,
      tasksAtRisk, mineTodayTasks,
      equipmentResult,
      inventoryResult,
    ] = await Promise.all([
      this.projectRepo.count(auth.tenantId, { ...projectFilter, status: ProjectStatus.ACTIVE }),
      this.projectRepo.count(auth.tenantId, { ...projectFilter, status: ProjectStatus.ON_HOLD }),
      this.projectRepo.count(auth.tenantId, {
        ...projectFilter,
        status: ProjectStatus.ACTIVE,
        endDate: { $lte: thirtyDaysFromNow },
      }),
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
      this.loadEquipmentKpis(auth),
      this.loadInventoryKpis(auth),
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
      equipment: equipmentResult,
      inventory: inventoryResult,
    };
  }

  private async loadEquipmentKpis(auth: AuthContext) {
    const allEquipment = await this.equipmentService.find(auth, {}, { page: 1, perPage: 1000 });
    const items = allEquipment.items;
    const total = items.length;
    const available = items.filter((e) => e.status === EquipmentStatus.AVAILABLE).length;
    const assigned = items.filter((e) => e.status === EquipmentStatus.ASSIGNED).length;
    const inMaintenance = items.filter((e) => e.status === EquipmentStatus.MAINTENANCE).length;

    const alerts = await this.equipmentReportService.getUpcomingMaintenance(auth.tenantId, 30);
    const upcomingMaintenance = alerts.length;

    return { total, available, assigned, inMaintenance, utilizationRate: total > 0 ? Math.round((assigned / total) * 100) : 0, upcomingMaintenance };
  }

  private async loadInventoryKpis(auth: AuthContext) {
    const allMaterials = await this.inventoryService.find(auth, {}, { page: 1, perPage: 1000 });
    const totalMaterials = allMaterials.items.length;
    const lowStockItems = allMaterials.items.filter((m) => m.isLowStock).length;
    const totalStockQuantity = allMaterials.items.reduce((sum, m) => sum + (m.stockLevel?.quantity ?? 0), 0);

    return { totalMaterials, lowStockItems, totalStockQuantity };
  }
}
