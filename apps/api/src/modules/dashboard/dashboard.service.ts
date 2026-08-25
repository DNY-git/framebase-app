import { Injectable, Inject } from '@nestjs/common';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { TaskRepository } from '../tasks/repositories/task.repository';
import { EquipmentService } from '../equipment/equipment.service';
import { EquipmentReportService } from '../equipment/equipment-report.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/authorization/authorization.types';
import {
  AuditLogDomain,
  DashboardOverview,
  InventoryTransactionDomain,
  ProjectDomain,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  EquipmentStatus,
} from '@constructtrack/types';

const TREND_MONTHS = 6;
const RECENT_EXPENSES = 6;
const RECENT_ACTIVITY = 8;
const HEATMAP_DAYS = 16 * 7;

/**
 * Canonical month key used across the dashboard trend: `YYYY-MM`
 * (zero-padded). Must match the MongoDB `$dateToString: { format: '%Y-%m' }`
 * output used by the inventory transaction aggregation, otherwise spend
 * rows never line up with the budget months.
 */
export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(AuthorizationService) private readonly authzService: AuthorizationService,
    @Inject(ProjectRepository) private readonly projectRepo: ProjectRepository,
    @Inject(TaskRepository) private readonly taskRepo: TaskRepository,
    @Inject(EquipmentService) private readonly equipmentService: EquipmentService,
    @Inject(EquipmentReportService) private readonly equipmentReportService: EquipmentReportService,
    @Inject(InventoryService) private readonly inventoryService: InventoryService,
    @Inject(AuditService) private readonly auditService: AuditService,
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

    const trendStart = this.trendStart(now);
    const heatmapStart = new Date(now.getTime() - HEATMAP_DAYS * 24 * 3600 * 1000);
    const [
      activeProjects, onHoldProjects, completingSoonProjects,
      tasksAtRisk, mineTodayTasks,
      equipmentResult,
      inventoryResult,
      projects,
      totalBudgetCents,
      spendRows,
      allTimeSpendRows,
      recentTransactions,
      materials,
      activity,
      activityDays,
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
      this.loadProjects(auth, projectFilter),
      this.projectRepo.sumBudgetCents(auth.tenantId, projectFilter),
      this.inventoryService.sumCostCentsByProjectAndMonth(auth, { since: trendStart }),
      this.inventoryService.sumCostCentsByProjectAndMonth(auth),
      this.loadRecentTransactions(auth),
      this.loadMaterials(auth),
      this.auditService.findAll(auth.tenantId, { page: 1, perPage: RECENT_ACTIVITY }),
      this.auditService.countByDay(auth.tenantId, heatmapStart),
    ]);

    // Total Spent is all-time ("to date"); the trend uses the 6-month window.
    const totalSpentCents = allTimeSpendRows.reduce((sum, r) => sum + r.total, 0);
    const spendByProject = new Map<string, number>();
    for (const r of allTimeSpendRows) {
      if (r.projectId) {
        spendByProject.set(r.projectId, (spendByProject.get(r.projectId) ?? 0) + r.total);
      }
    }

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
      financial: {
        totalBudgetCents,
        totalSpentCents,
        remainingBudgetCents: totalBudgetCents - totalSpentCents,
      },
      spendingTrend: this.buildSpendingTrend(projects, spendRows, trendStart),
      projectProgress: this.buildProjectProgress(projects, spendByProject),
      recentExpenses: this.buildRecentExpenses(recentTransactions, projects, materials),
      recentActivity: this.buildRecentActivity(activity.items),
      activityHeatmap: this.buildActivityHeatmap(activityDays),
    };
  }

  private loadProjects(
    auth: AuthContext,
    filter: Record<string, unknown>,
  ): Promise<ProjectDomain[]> {
    return this.projectRepo
      .find(auth.tenantId, filter, { page: 1, perPage: 100 })
      .then((r) => r.items);
  }

  private loadRecentTransactions(auth: AuthContext): Promise<InventoryTransactionDomain[]> {
    return this.inventoryService
      .getTransactions(auth, {}, { page: 1, perPage: 20 })
      .then((r) => r.items);
  }

  private loadMaterials(auth: AuthContext) {
    return this.inventoryService
      .find(auth, {}, { page: 1, perPage: 1000 })
      .then((r) => r.items);
  }

  private trendStart(now: Date): Date {
    return new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1), 1);
  }

  /**
   * Monthly trend over the last 6 months:
   * - `spent`  = real purchase spend per month (aggregated from transactions)
   * - `budget` = project budget allocated linearly across each project's
   *   active months (startDate→endDate). Nothing fabricated — a documented
   *   allocation of real budgets.
   */
  private buildSpendingTrend(
    projects: ProjectDomain[],
    spendRows: Array<{ projectId: string | null; monthKey: string; total: number }>,
    _trendStart: Date,
  ): DashboardOverview['spendingTrend'] {
    const now = new Date();
    const months: Array<{ key: string; label: string; start: number; end: number }> = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: monthKeyOf(d),
        label: d.toLocaleString('en-US', { month: 'short' }),
        start: d.getTime(),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
      });
    }

    const spentByMonth = new Map<string, number>();
    for (const r of spendRows) {
      spentByMonth.set(r.monthKey, (spentByMonth.get(r.monthKey) ?? 0) + r.total);
    }

    const budgetByMonth = new Map<string, number>();
    for (const p of projects) {
      const budget = p.budgetCents ?? 0;
      if (budget <= 0) continue;
      const start = p.startDate ? new Date(p.startDate).getTime() : new Date(p.createdAt).getTime();
      let end = p.endDate ? new Date(p.endDate).getTime() : Date.now();
      if (end < start) end = start;
      const monthCount = Math.max(1, Math.round((end - start) / (30.44 * 24 * 3600 * 1000)));
      const monthlyAllocation = Math.round(budget / monthCount);
      for (const m of months) {
        if (m.end > start && m.start <= end) {
          budgetByMonth.set(m.key, (budgetByMonth.get(m.key) ?? 0) + monthlyAllocation);
        }
      }
    }

    return months.map((m) => ({
      month: m.label,
      monthKey: m.key,
      budget: budgetByMonth.get(m.key) ?? 0,
      spent: spentByMonth.get(m.key) ?? 0,
    }));
  }

  private buildProjectProgress(
    projects: ProjectDomain[],
    spendByProject: Map<string, number>,
  ): DashboardOverview['projectProgress'] {
    return projects
      .filter((p) => p.status === ProjectStatus.ACTIVE)
      .map((p) => {
        const budgetCents = p.budgetCents ?? 0;
        const spentCents = spendByProject.get(p.id) ?? 0;
        const budgetUtilizationPercent =
          budgetCents > 0 ? Math.min(100, Math.round((spentCents / budgetCents) * 100)) : 0;
        return {
          id: p.id,
          name: p.name,
          code: p.code,
          status: p.status,
          progressPercent: this.timeProgress(p),
          budgetCents,
          spentCents,
          budgetUtilizationPercent,
        };
      })
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 8);
  }

  /** Time-based progress (same rule as the projects list UI). */
  private timeProgress(p: ProjectDomain): number {
    if (p.status === ProjectStatus.COMPLETED || p.status === ProjectStatus.ARCHIVED) return 100;
    if (!p.startDate || !p.endDate) return 0;
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    if (end <= start) return 0;
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  private buildRecentExpenses(
    transactions: InventoryTransactionDomain[],
    projects: ProjectDomain[],
    materials: Array<{ id: string; name: string }>,
  ): DashboardOverview['recentExpenses'] {
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const materialNameById = new Map(materials.map((m) => [m.id, m.name]));

    return transactions
      .filter((tx) => (tx.costCents ?? 0) > 0)
      .slice(0, RECENT_EXPENSES)
      .map((tx) => {
        const project = tx.projectId ? projectById.get(tx.projectId) : undefined;
        return {
          id: tx.id,
          description: tx.note || 'Material purchase',
          projectId: tx.projectId ?? null,
          projectName: project?.name ?? null,
          materialName: materialNameById.get(tx.materialId) ?? 'Material',
          amountCents: tx.costCents ?? 0,
          createdAt: tx.createdAt,
        };
      });
  }

  private buildRecentActivity(logs: AuditLogDomain[]): DashboardOverview['recentActivity'] {
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      createdAt: log.createdAt,
    }));
  }

  /**
   * Daily work-activity heatmap for the last 16 weeks — real audit-log
   * entries bucketed per UTC calendar day. Zero-activity days are filled
   * so the grid is always complete (nothing fabricated).
   */
  private buildActivityHeatmap(
    rows: Array<{ date: string; count: number }>,
  ): DashboardOverview['activityHeatmap'] {
    const countByDate = new Map(rows.map((r) => [r.date, r.count]));
    const now = new Date();
    const out: Array<{ date: string; count: number }> = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: countByDate.get(key) ?? 0 });
    }
    return out;
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