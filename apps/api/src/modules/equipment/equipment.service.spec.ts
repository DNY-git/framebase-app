
import { EquipmentService } from './equipment.service';
import { Role, EquipmentStatus } from '@constructtrack/types';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EquipmentService', () => {
  let service: EquipmentService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let equipmentRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignmentRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authzService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let auditService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let usageLogRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maintenanceRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let downtimeRepo: any;

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
      equipmentRepo,
      assignmentRepo,
      authzService,
      auditService,
      usageLogRepo,
      maintenanceRepo,
      downtimeRepo,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.create({ ...mockAuthContext, role: Role.CREW }, {} as any))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws Conflict if serial number exists', async () => {
      equipmentRepo.exists.mockResolvedValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.create(mockAuthContext, { serialNumber: 'SN123' } as any))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('assign', () => {
    it('creates an assignment if everything is valid', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      assignmentRepo.hasOverlappingAssignment.mockResolvedValue(false);
      
      const assignment = { id: 'asgn-1', active: true };
      assignmentRepo.create.mockResolvedValue(assignment);

      const result = await service.assign(mockAuthContext, 'eq-1', {
        projectId: 'proj-1',
        startDate: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(result).toEqual(assignment);
      expect(equipmentRepo.update).toHaveBeenCalledWith('tenant-1', 'eq-1', { status: EquipmentStatus.ASSIGNED });
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws Conflict if equipment is in maintenance', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue({ ...mockEquipment, status: EquipmentStatus.MAINTENANCE });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.assign(mockAuthContext, 'eq-1', { projectId: 'proj-1', startDate: new Date() } as any))
        .rejects.toThrow(ConflictException);
    });

    it('throws Conflict if overlapping assignment exists', async () => {
      authzService.assertProjectManager.mockResolvedValue(true);
      equipmentRepo.findById.mockResolvedValue(mockEquipment);
      assignmentRepo.hasOverlappingAssignment.mockResolvedValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.assign(mockAuthContext, 'eq-1', { projectId: 'proj-1', startDate: new Date() } as any))
        .rejects.toThrow(ConflictException);
    });
  });
});
