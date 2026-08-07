import { DomainException } from '../../common/exceptions/domain.exception';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipmentReportService } from './equipment-report.service';
import {
  EquipmentDomain,
  EquipmentUsageLogDomain,
  MaintenanceRecordDomain,
  DowntimeLogDomain,
  MaintenanceStatus,
  MaintenanceType,
  DowntimeReason,
  EquipmentStatus,
} from '@constructtrack/types';

describe('EquipmentReportService', () => {
  let service: EquipmentReportService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let equipmentRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let usageLogRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maintenanceRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let downtimeRepo: any;

  const TENANT_ID = 'tenant-123';
  const EQUIPMENT_ID = 'equip-001';

  const mockEquipment: EquipmentDomain = {
    id: EQUIPMENT_ID,
    tenantId: TENANT_ID,
    name: 'Excavator 1',
    serialNumber: 'SN-EXC-001',
    category: 'heavy',
    status: EquipmentStatus.AVAILABLE,
    purchaseDate: new Date('2020-01-01'),
    purchaseCostCents: 500000000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    equipmentRepo = {
      findById: vi.fn(),
    };

    usageLogRepo = {
      findByDateRange: vi.fn(),
      findByDateRangePaginated: vi.fn(),
    };

    maintenanceRepo = {
      findByStatus: vi.fn(),
      findByEquipment: vi.fn(),
    };

    downtimeRepo = {
      findByDateRange: vi.fn(),
      findByEquipment: vi.fn(),
    };

    service = new EquipmentReportService(
      equipmentRepo,
      usageLogRepo,
      maintenanceRepo,
      downtimeRepo,
    );
  });

  describe('getUtilization', () => {
    it('should calculate utilization correctly', async () => {
      const fromDate = new Date('2026-07-01');
      const toDate = new Date('2026-07-08'); // 5 work days (Mon-Fri)

      const usageLogs: EquipmentUsageLogDomain[] = [
        {
          id: 'log-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          date: new Date('2026-07-01'),
          hoursUsed: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'log-2',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          date: new Date('2026-07-02'),
          hoursUsed: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      usageLogRepo.findByDateRange.mockResolvedValue(usageLogs);
      downtimeRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getUtilization(TENANT_ID, EQUIPMENT_ID, fromDate, toDate);

      expect(result.equipmentId).toBe(EQUIPMENT_ID);
      expect(result.name).toBe('Excavator 1');
      expect(result.utilizationHours).toBe(14); // 8 + 6 hours
      expect(result.totalHours).toBe(40); // 5 days * 8 hours
      expect(result.utilizationPercentage).toBe(35); // 14/40 * 100
    });

    it('should throw NotFoundException if equipment not found', async () => {
      equipmentRepo.findById.mockResolvedValue(null);

      await expect(
        service.getUtilization(TENANT_ID, EQUIPMENT_ID, new Date('2026-07-01'), new Date('2026-07-08')),
      ).rejects.toThrow(DomainException);
    });

    it('should throw DomainException if fromDate >= toDate', async () => {
      const fromDate = new Date('2026-07-08');
      const toDate = new Date('2026-07-01');

      await expect(service.getUtilization(TENANT_ID, EQUIPMENT_ID, fromDate, toDate)).rejects.toThrow(
        DomainException,
      );
    });

    it('should subtract downtime hours from available hours', async () => {
      const fromDate = new Date('2026-07-01');
      const toDate = new Date('2026-07-08');

      const usageLogs: EquipmentUsageLogDomain[] = [
        {
          id: 'log-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          date: new Date('2026-07-01'),
          hoursUsed: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const downtimeLogs: DowntimeLogDomain[] = [
        {
          id: 'downtime-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          startDate: new Date('2026-07-03T08:00:00'),
          endDate: new Date('2026-07-03T16:00:00'), // 8 hours full day
          reason: DowntimeReason.BREAKDOWN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      usageLogRepo.findByDateRange.mockResolvedValue(usageLogs);
      downtimeRepo.findByDateRange.mockResolvedValue(downtimeLogs);

      const result = await service.getUtilization(TENANT_ID, EQUIPMENT_ID, fromDate, toDate);

      // Total available: 40 hours (5 days * 8)
      // Downtime: 8 hours
      // Available after downtime: 32 hours
      // Utilization: 8/32 = 25%
      expect(result.downTimeHours).toBe(8);
      expect(result.utilizationPercentage).toBe(25);
    });
  });

  describe('getUpcomingMaintenance', () => {
    it('should return upcoming maintenance within threshold', async () => {
      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + 10);

      const maintenanceRecords: MaintenanceRecordDomain[] = [
        {
          id: 'maint-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          type: MaintenanceType.SCHEDULED,
          status: MaintenanceStatus.PENDING,
          nextDueAt: upcomingDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      maintenanceRepo.findByStatus.mockResolvedValue({
        items: maintenanceRecords,
        page: 1,
        perPage: 1000,
        totalItems: 1,
        totalPages: 1,
      });

      equipmentRepo.findById.mockResolvedValue(mockEquipment);

      const alerts = await service.getUpcomingMaintenance(TENANT_ID, 30);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].equipmentName).toBe('Excavator 1');
      expect(alerts[0].isOverdue).toBe(false);
      expect(alerts[0].daysUntilDue).toBe(10);
    });

    it('should return overdue maintenance', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 5); // 5 days overdue

      const maintenanceRecords: MaintenanceRecordDomain[] = [
        {
          id: 'maint-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          type: MaintenanceType.SCHEDULED,
          status: MaintenanceStatus.PENDING,
          nextDueAt: overdueDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      maintenanceRepo.findByStatus.mockResolvedValue({
        items: maintenanceRecords,
        page: 1,
        perPage: 1000,
        totalItems: 1,
        totalPages: 1,
      });

      equipmentRepo.findById.mockResolvedValue(mockEquipment);

      const alerts = await service.getUpcomingMaintenance(TENANT_ID, 30);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].isOverdue).toBe(true);
      expect(alerts[0].daysUntilDue).toBeLessThan(0);
    });

    it('should throw DomainException if daysThreshold < 1', async () => {
      await expect(service.getUpcomingMaintenance(TENANT_ID, 0)).rejects.toThrow(
        DomainException,
      );
    });

    it('should sort alerts by urgency (overdue first)', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 5);

      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 3);

      const maintenanceRecords: MaintenanceRecordDomain[] = [
        {
          id: 'maint-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          type: MaintenanceType.SCHEDULED,
          status: MaintenanceStatus.PENDING,
          nextDueAt: soonDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'maint-2',
          tenantId: 'eq-002',
          equipmentId: 'eq-002',
          type: MaintenanceType.SCHEDULED,
          status: MaintenanceStatus.PENDING,
          nextDueAt: overdueDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      maintenanceRepo.findByStatus.mockResolvedValue({
        items: maintenanceRecords,
        page: 1,
        perPage: 1000,
        totalItems: 2,
        totalPages: 1,
      });

      equipmentRepo.findById
        .mockResolvedValueOnce(mockEquipment)
        .mockResolvedValueOnce({ ...mockEquipment, id: 'eq-002' });

      const alerts = await service.getUpcomingMaintenance(TENANT_ID, 30);

      // Overdue should come first
      expect(alerts[0].isOverdue).toBe(true);
      expect(alerts[1].isOverdue).toBe(false);
    });
  });

  describe('getMaintenanceHistory', () => {
    it('should return maintenance history for equipment', async () => {
      const records: MaintenanceRecordDomain[] = [
        {
          id: 'maint-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          type: MaintenanceType.SCHEDULED,
          status: MaintenanceStatus.COMPLETED,
          date: new Date('2026-06-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      maintenanceRepo.findByEquipment.mockResolvedValue({
        items: records,
        page: 1,
        perPage: 20,
        totalItems: 1,
        totalPages: 1,
      });

      const result = await service.getMaintenanceHistory(TENANT_ID, EQUIPMENT_ID, {
        page: 1,
        perPage: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('maint-1');
    });

    it('should throw NotFoundException if equipment not found', async () => {
      equipmentRepo.findById.mockResolvedValue(null);

      await expect(
        service.getMaintenanceHistory(TENANT_ID, EQUIPMENT_ID, { page: 1, perPage: 20 }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getUsageTimeline', () => {
    it('should return usage timeline for equipment', async () => {
      const logs: EquipmentUsageLogDomain[] = [
        {
          id: 'log-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          date: new Date('2026-07-01'),
          hoursUsed: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      usageLogRepo.findByDateRangePaginated.mockResolvedValue({
        items: logs,
        page: 1,
        perPage: 20,
        totalItems: 1,
        totalPages: 1,
      });

      const result = await service.getUsageTimeline(
        TENANT_ID,
        EQUIPMENT_ID,
        new Date('2026-07-01'),
        new Date('2026-07-31'),
        { page: 1, perPage: 20 },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].hoursUsed).toBe(8);
    });
  });

  describe('getDowntimeHistory', () => {
    it('should return downtime history for equipment', async () => {
      const logs: DowntimeLogDomain[] = [
        {
          id: 'downtime-1',
          tenantId: TENANT_ID,
          equipmentId: EQUIPMENT_ID,
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-02'),
          reason: DowntimeReason.BREAKDOWN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      downtimeRepo.findByEquipment.mockResolvedValue({
        items: logs,
        page: 1,
        perPage: 20,
        totalItems: 1,
        totalPages: 1,
      });

      const result = await service.getDowntimeHistory(TENANT_ID, EQUIPMENT_ID, {
        page: 1,
        perPage: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].reason).toBe(DowntimeReason.BREAKDOWN);
    });
  });
});
