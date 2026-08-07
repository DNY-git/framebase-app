import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import {
  MaintenanceRecordDomain,
  EquipmentUsageLogDomain,
  DowntimeLogDomain,
  MaintenanceStatus,
  PaginationOptions,
  PaginatedResponse,
} from '@constructtrack/types';
import { EquipmentRepository } from './repositories/equipment.repository';
import { EquipmentUsageLogRepository } from './repositories/equipment-usage-log.repository';
import { MaintenanceRecordRepository } from './repositories/maintenance-record.repository';
import { DowntimeLogRepository } from './repositories/downtime-log.repository';

export interface UtilizationMetric {
  equipmentId: string;
  name: string;
  fromDate: Date;
  toDate: Date;
  totalHours: number;
  utilizationPercentage: number;
  utilizationHours: number;
  downTimeHours: number;
  costCents?: number;
}

export interface MaintenanceAlert {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: string;
  status: string;
  nextDueAt: Date | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  notes?: string;
}

@Injectable()
export class EquipmentReportService {
  private readonly WORK_HOURS_PER_DAY = 8;

  constructor(
    private readonly equipmentRepository: EquipmentRepository,
    private readonly usageLogRepository: EquipmentUsageLogRepository,
    private readonly maintenanceRepository: MaintenanceRecordRepository,
    private readonly downtimeRepository: DowntimeLogRepository,
  ) {}

  /**
   * Calculate utilization percentage for equipment over a date range.
   * Utilization = (hours used) / (available hours - downtime hours)
   */
  async getUtilization(
    tenantId: string,
    equipmentId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<UtilizationMetric> {
    // Validate dates
    if (!this.isValidDate(fromDate) || !this.isValidDate(toDate) || fromDate >= toDate) {
      throw new DomainException(ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, 'fromDate must be a valid date before toDate');
    }

    // Verify equipment exists and belongs to tenant
    const equipment = await this.equipmentRepository.findById(tenantId, equipmentId);
    if (!equipment) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Equipment not found');
    }

    // Calculate total available hours (work days only, assuming 8-hour days)
    const totalDays = this.calculateWorkDays(fromDate, toDate);
    const totalAvailableHours = totalDays * this.WORK_HOURS_PER_DAY;

    // Get usage logs for the period
    const usageData = await this.usageLogRepository.findByDateRange(
      tenantId,
      equipmentId,
      fromDate,
      toDate,
    );
    const utilizationHours = usageData.reduce((sum, log) => sum + log.hoursUsed, 0);

    // Get downtime logs for the period
    const downtimeData = await this.downtimeRepository.findByDateRange(
      tenantId,
      equipmentId,
      fromDate,
      toDate,
    );
    const downTimeHours = this.calculateDowntimeHours(downtimeData);

    // Calculate utilization percentage
    const availableAfterDowntime = Math.max(0, totalAvailableHours - downTimeHours);
    const utilizationPercentage =
      availableAfterDowntime > 0 ? (utilizationHours / availableAfterDowntime) * 100 : 0;

    return {
      equipmentId,
      name: equipment.name,
      fromDate,
      toDate,
      totalHours: totalAvailableHours,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      utilizationHours: Math.round(utilizationHours * 100) / 100,
      downTimeHours: Math.round(downTimeHours * 100) / 100,
      costCents: equipment.purchaseCostCents,
    };
  }

  /**
   * Get upcoming maintenance for the entire fleet, optionally filtered by days threshold.
   */
  async getUpcomingMaintenance(
    tenantId: string,
    daysThreshold: number = 30,
  ): Promise<MaintenanceAlert[]> {
    if (daysThreshold < 1) {
      throw new DomainException(ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, 'daysThreshold must be at least 1 day');
    }

    const now = new Date();
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + daysThreshold);

    // Fetch all pending/scheduled maintenance records within the window
    const pendingRecords = await this.maintenanceRepository.findByStatus(
      tenantId,
      MaintenanceStatus.PENDING,
      { page: 1, perPage: 1000 }, // Fetch up to 1000 maintenance records
    );

    const alerts: MaintenanceAlert[] = [];

    for (const record of pendingRecords.items) {
      if (!record.nextDueAt) continue;

      const equipment = await this.equipmentRepository.findById(tenantId, record.equipmentId);
      if (!equipment) continue;

      const daysUntilDue = Math.ceil(
        (record.nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isOverdue = daysUntilDue < 0;

      if (isOverdue || daysUntilDue <= daysThreshold) {
        alerts.push({
          id: record.id,
          equipmentId: record.equipmentId,
          equipmentName: equipment.name,
          type: record.type,
          status: record.status,
          nextDueAt: record.nextDueAt,
          daysUntilDue: isOverdue ? daysUntilDue : Math.floor(daysUntilDue),
          isOverdue,
          notes: record.notes,
        });
      }
    }

    // Sort by days until due (overdue first, then soonest due)
    alerts.sort((a, b) => a.daysUntilDue! - b.daysUntilDue!);

    return alerts;
  }

  /**
   * Get maintenance history for a specific equipment.
   */
  async getMaintenanceHistory(
    tenantId: string,
    equipmentId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<MaintenanceRecordDomain>> {
    // Verify equipment exists
    const equipment = await this.equipmentRepository.findById(tenantId, equipmentId);
    if (!equipment) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Equipment not found');
    }

    return this.maintenanceRepository.findByEquipment(tenantId, equipmentId, options);
  }

  /**
   * Get usage timeline (detailed hourly log) for equipment over a date range.
   */
  async getUsageTimeline(
    tenantId: string,
    equipmentId: string,
    fromDate: Date,
    toDate: Date,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<EquipmentUsageLogDomain>> {
    // Verify equipment exists
    const equipment = await this.equipmentRepository.findById(tenantId, equipmentId);
    if (!equipment) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Equipment not found');
    }

    return this.usageLogRepository.findByDateRangePaginated(
      tenantId,
      equipmentId,
      fromDate,
      toDate,
      options,
    );
  }

  /**
   * Get downtime history for equipment.
   */
  async getDowntimeHistory(
    tenantId: string,
    equipmentId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<DowntimeLogDomain>> {
    // Verify equipment exists
    const equipment = await this.equipmentRepository.findById(tenantId, equipmentId);
    if (!equipment) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Equipment not found');
    }

    return this.downtimeRepository.findByEquipment(tenantId, equipmentId, options);
  }

  // ====== Private Helper Methods ======

  /**
   * Calculate working days between two dates (Monday-Friday only).
   */
  private calculateWorkDays(fromDate: Date, toDate: Date): number {
    let count = 0;
    const current = new Date(fromDate);

    while (current < toDate) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday; count if weekday (1-5 = Mon-Fri)
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime());
  }

  /**
   * Calculate total downtime hours from downtime log records.
   */
  private calculateDowntimeHours(downtimeLogs: DowntimeLogDomain[]): number {
    return downtimeLogs.reduce((sum, log) => {
      if (!log.endDate) {
        // Still ongoing; assume it's partial day
        return sum + this.WORK_HOURS_PER_DAY / 2;
      }
      const hours = (log.endDate.getTime() - log.startDate.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
  }
}
