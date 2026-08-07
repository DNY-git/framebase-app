import { EquipmentService } from './equipment.service';
import { Role, EquipmentStatus, MaintenanceStatus } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let equipmentRepo: Record<string, ReturnType<typeof vi.fn>>;
  let assignmentRepo: Record<string, ReturnType<typeof vi.fn>>;
  let authzService: Record<string, ReturnType<typeof vi.fn>>;
  let auditService: Record<string, ReturnType<typeof vi.fn>>;
  let usageLogRepo: Record<string, ReturnType<typeof vi.fn>>;
  let maintenanceRepo: Record<string, ReturnType<typeof vi.fn>>;
  let downtimeRepo: Record<string, ReturnType<typeof vi.fn>>;

  const mockAuthContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: Role.FLEET_MANAGER,
  };

  const mockEquipment = {
    id: 'eq-1',
    tenantId: 'tenant-1',
    name: 'Excavator',
    serialNumber: 'SN123',
    category: 'Heavy',
    status: EquipmentStatus.AVAILABLE,
    purchaseCostCents: 5000000,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockAssignment = {
    id: 'asgn-1',
    tenantId: 'tenant-1',
    equipmentId: 'eq-1',
    projectId: 'proj-1',
    startDate: new Date(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    equipmentRepo = {
      create: vi.fn(),
      exists: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };

    assignmentRepo = {
      hasOverlappingAssignment: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };

    authzService = {
      assertProjectManager: vi.fn(),
    };

    auditService = {
      record: vi.fn(),
    };

    usageLogRepo = {
      create: vi.fn(),
      find: vi.fn(),
    };

    maintenanceRepo = {
      create: vi.fn(),
      update: vi.fn(),
      find: vi.fn(),
    };

    downtimeRepo = {
      create: vi.fn(),
      find: vi.fn(),
    };

    service = new EquipmentService(
      equipmentRepo as never,
      assignmentRepo as never,
      authzService as never,
      auditService as never,
      usageLogRepo as never,
      maintenanceRepo as never,
      downtimeRepo as never,
    );
  });

  describe('create', () => {
    it('creates equipment if fleet manager', async () => {
      equipmentRepo.exists.mockResolvedValue(false);
      equipmentRepo.create.mockResolvedValue(mockEquipment);

      const dto = { name: 'Excavator', serialNumber: 'SN123', category: 'Heavy' };
      const result = await service.create(mockAuthContext, dto);

      expect(result).toEqual(mockEquipment);
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws Forbidden if not fleet manager or admin', async () => {
      await expect(service.create({ ...mockAuthContext, role: Role.CREW }, {} as never))
        .rejects.toThrow(DomainException);
    });

    it('throws Conflict if serial number exists', async () => {
      equipmentRepo.exists.mockResolvedValue(true);
      await expect(service.create(mockAuthContext, { serialNumber: 'SN123' } as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('find', () => {
    it('returns paginated equipment for the tenant', async () => {
      const paginatedResult = {
        items: [mockEquipment],
        page: 1,
        perPage: 20,
        totalItems: 1,
        totalPages: 1,
      };
      equipmentRepo.find.mockResolvedValue(paginatedResult);

      const result = await service.find(mockAuthContext, { status: EquipmentStatus.AVAILABLE }, { page: 1, perPage: 20 });

      expect(result).toEqual(paginatedResult);
      expect(equipmentRepo.find).toHaveBeenCalledWith('tenant-1', { status: EquipmentStatus.AVAILABLE }, { page: 1, perPage: 20 });
    });
  });

  describe('findById', () => {
    it('returns equipment when found', async () => {
      equipmentRepo.findById.mockResolvedValue(mockEquipment);

      const result = await service.findById(mockAuthContext, 'eq-1');
      expect(result).toEqual(mockEquipment);
    });

    it('throws NotFoundException when not found', async () => {
      equipmentRepo.findById.mockResolvedValue(null);

      await expect(service.findById(mockAuthContext, 'nonexistent'))
        .rejects.toThrow(DomainException);
    });
  });

  describe('update', () => {
    it('updates equipment and records audit', async () => {
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      equipmentRepo.exists.mockResolvedValue(false);
      const updated = { ...mockEquipment, name: 'Updated Excavator' };
      equipmentRepo.update.mockResolvedValue(updated);

      const result = await service.update(mockAuthContext, 'eq-1', { name: 'Updated Excavator' });

      expect(result).toEqual(updated);
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws Conflict when updating to an existing serial number', async () => {
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      equipmentRepo.exists.mockResolvedValue(true);

      await expect(service.update(mockAuthContext, 'eq-1', { serialNumber: 'SN999' }))
        .rejects.toThrow(DomainException);
    });

    it('throws NotFoundException when equipment does not exist', async () => {
      equipmentRepo.findById.mockResolvedValue(null);

      await expect(service.update(mockAuthContext, 'nonexistent', { name: 'Ghost' }))
        .rejects.toThrow(DomainException);
    });

    it('throws Forbidden if caller is not fleet manager', async () => {
      await expect(service.update({ ...mockAuthContext, role: Role.CREW }, 'eq-1', { name: 'Nope' }))
        .rejects.toThrow(DomainException);
    });
  });

  describe('assign', () => {
    it('creates an assignment if everything is valid', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      assignmentRepo.hasOverlappingAssignment.mockResolvedValue(false);

      assignmentRepo.create.mockResolvedValue(mockAssignment);

      const result = await service.assign(mockAuthContext, 'eq-1', {
        projectId: 'proj-1',
        startDate: new Date(),
      } as never);

      expect(result).toEqual(mockAssignment);
      expect(equipmentRepo.update).toHaveBeenCalledWith('tenant-1', 'eq-1', { status: EquipmentStatus.ASSIGNED });
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws Conflict if equipment is in maintenance', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue({ ...mockEquipment, status: EquipmentStatus.MAINTENANCE });

      await expect(service.assign(mockAuthContext, 'eq-1', { projectId: 'proj-1', startDate: new Date() } as never))
        .rejects.toThrow(DomainException);
    });

    it('throws Conflict if equipment is retired', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue({ ...mockEquipment, status: EquipmentStatus.RETIRED });

      await expect(service.assign(mockAuthContext, 'eq-1', { projectId: 'proj-1', startDate: new Date() } as never))
        .rejects.toThrow(DomainException);
    });

    it('throws Conflict if overlapping assignment exists', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      assignmentRepo.hasOverlappingAssignment.mockResolvedValue(true);

      await expect(service.assign(mockAuthContext, 'eq-1', { projectId: 'proj-1', startDate: new Date() } as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('release', () => {
    it('releases an active assignment', async () => {
      assignmentRepo.findById.mockResolvedValue(mockAssignment);
      authzService.assertProjectManager.mockResolvedValue(true);
      assignmentRepo.count.mockResolvedValue(0);

      await service.release(mockAuthContext, 'eq-1', 'asgn-1');

      expect(assignmentRepo.update).toHaveBeenCalledWith('tenant-1', 'asgn-1', {
        active: false,
        endDate: expect.any(Date),
      });
      expect(equipmentRepo.update).toHaveBeenCalledWith('tenant-1', 'eq-1', { status: EquipmentStatus.AVAILABLE });
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws NotFoundException if assignment not found', async () => {
      assignmentRepo.findById.mockResolvedValue(null);

      await expect(service.release(mockAuthContext, 'eq-1', 'nonexistent'))
        .rejects.toThrow(DomainException);
    });

    it('throws NotFoundException if assignment belongs to different equipment', async () => {
      assignmentRepo.findById.mockResolvedValue({ ...mockAssignment, equipmentId: 'other-eq' });

      await expect(service.release(mockAuthContext, 'eq-1', 'asgn-1'))
        .rejects.toThrow(DomainException);
    });

    it('does nothing if assignment is already inactive', async () => {
      assignmentRepo.findById.mockResolvedValue({ ...mockAssignment, active: false });
      authzService.assertProjectManager.mockResolvedValue(true);

      await service.release(mockAuthContext, 'eq-1', 'asgn-1');

      expect(assignmentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('logUsage', () => {
    it('creates a usage log when equipment exists', async () => {
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      const usageLog = { id: 'ul-1', equipmentId: 'eq-1', date: new Date(), hoursUsed: 8 };
      usageLogRepo.create.mockResolvedValue(usageLog);

      const result = await service.logUsage(mockAuthContext, 'eq-1', {
        date: new Date().toISOString(),
        hoursUsed: 8,
      } as never);

      expect(result).toEqual(usageLog);
      expect(usageLogRepo.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ equipmentId: 'eq-1' }));
    });

    it('throws NotFoundException if equipment does not exist', async () => {
      equipmentRepo.findById.mockResolvedValue(null);

      await expect(service.logUsage(mockAuthContext, 'nonexistent', {} as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('getUsageLogs', () => {
    it('returns paginated usage logs', async () => {
      const paginated = { items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 };
      usageLogRepo.find.mockResolvedValue(paginated);

      const result = await service.getUsageLogs(mockAuthContext, 'eq-1', { page: 1, perPage: 20 });

      expect(result).toEqual(paginated);
      expect(usageLogRepo.find).toHaveBeenCalledWith('tenant-1', { equipmentId: 'eq-1' }, { page: 1, perPage: 20 });
    });
  });

  describe('scheduleMaintenance', () => {
    it('creates a maintenance record', async () => {
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      const record = { id: 'maint-1', equipmentId: 'eq-1', type: 'SCHEDULED', status: 'PENDING' };
      maintenanceRepo.create.mockResolvedValue(record);

      const result = await service.scheduleMaintenance(mockAuthContext, 'eq-1', {
        type: 'SCHEDULED',
        nextDueAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      } as never);

      expect(result).toEqual(record);
      expect(maintenanceRepo.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ equipmentId: 'eq-1' }));
    });

    it('throws Forbidden if not fleet manager', async () => {
      await expect(service.scheduleMaintenance({ ...mockAuthContext, role: Role.CREW }, 'eq-1', {} as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('updateMaintenance', () => {
    it('updates a maintenance record', async () => {
      const updated = { id: 'maint-1', equipmentId: 'eq-1', type: 'SCHEDULED', status: MaintenanceStatus.COMPLETED };
      maintenanceRepo.update.mockResolvedValue(updated);

      const result = await service.updateMaintenance(mockAuthContext, 'eq-1', 'maint-1', {
        status: MaintenanceStatus.COMPLETED,
      } as never);

      expect(result).toEqual(updated);
    });

    it('throws NotFoundException if record not found', async () => {
      maintenanceRepo.update.mockResolvedValue(null);

      await expect(service.updateMaintenance(mockAuthContext, 'eq-1', 'nonexistent', {} as never))
        .rejects.toThrow(DomainException);
    });

    it('throws NotFoundException if record belongs to different equipment', async () => {
      maintenanceRepo.update.mockResolvedValue({ id: 'maint-1', equipmentId: 'other-eq' });

      await expect(service.updateMaintenance(mockAuthContext, 'eq-1', 'maint-1', {} as never))
        .rejects.toThrow(DomainException);
    });

    it('throws Forbidden if not fleet manager', async () => {
      await expect(service.updateMaintenance({ ...mockAuthContext, role: Role.VIEWER }, 'eq-1', 'maint-1', {} as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('getMaintenanceRecords', () => {
    it('returns paginated maintenance records', async () => {
      const paginated = { items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 };
      maintenanceRepo.find.mockResolvedValue(paginated);

      const result = await service.getMaintenanceRecords(mockAuthContext, 'eq-1', { page: 1, perPage: 20 });

      expect(result).toEqual(paginated);
      expect(maintenanceRepo.find).toHaveBeenCalledWith('tenant-1', { equipmentId: 'eq-1' }, { page: 1, perPage: 20 });
    });
  });

  describe('logDowntime', () => {
    it('creates a downtime log', async () => {
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      const log = { id: 'dt-1', equipmentId: 'eq-1', reason: 'BREAKDOWN', startDate: new Date() };
      downtimeRepo.create.mockResolvedValue(log);

      const result = await service.logDowntime(mockAuthContext, 'eq-1', {
        reason: 'BREAKDOWN',
        startDate: new Date().toISOString(),
      } as never);

      expect(result).toEqual(log);
      expect(downtimeRepo.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ equipmentId: 'eq-1' }));
    });

    it('throws Forbidden if not fleet manager', async () => {
      await expect(service.logDowntime({ ...mockAuthContext, role: Role.CREW }, 'eq-1', {} as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('getDowntimeLogs', () => {
    it('returns paginated downtime logs', async () => {
      const paginated = { items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 };
      downtimeRepo.find.mockResolvedValue(paginated);

      const result = await service.getDowntimeLogs(mockAuthContext, 'eq-1', { page: 1, perPage: 20 });

      expect(result).toEqual(paginated);
      expect(downtimeRepo.find).toHaveBeenCalledWith('tenant-1', { equipmentId: 'eq-1' }, { page: 1, perPage: 20 });
    });
  });
});
