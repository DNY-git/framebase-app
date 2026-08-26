import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode, Role, EquipmentStatus } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { EquipmentRepository } from './repositories/equipment.repository';
import { EquipmentAssignmentRepository } from './repositories/equipment-assignment.repository';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { AssignEquipmentDto } from './dto/assign-equipment.dto';
import { AuthContext } from '../../common/authorization/authorization.types';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { EquipmentDomain, EquipmentAssignmentDomain, PaginationOptions, PaginatedResponse, EquipmentUsageLogDomain, MaintenanceRecordDomain, DowntimeLogDomain } from '@constructtrack/types';
import { isTenantAdmin } from '../../common/authorization/permissions';
import { EquipmentUsageLogRepository } from './repositories/equipment-usage-log.repository';
import { MaintenanceRecordRepository } from './repositories/maintenance-record.repository';
import { DowntimeLogRepository } from './repositories/downtime-log.repository';
import { CreateUsageLogDto } from './dto/create-usage-log.dto';
import { UpdateUsageLogDto } from './dto/update-usage-log.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { CreateDowntimeLogDto } from './dto/create-downtime-log.dto';

@Injectable()
export class EquipmentService {
  constructor(
    private readonly equipmentRepository: EquipmentRepository,
    private readonly assignmentRepository: EquipmentAssignmentRepository,
    private readonly authzService: AuthorizationService,
    private readonly auditService: AuditService,
    private readonly usageLogRepository: EquipmentUsageLogRepository,
    private readonly maintenanceRepository: MaintenanceRecordRepository,
    private readonly downtimeLogRepository: DowntimeLogRepository,
  ) {}

  private assertFleetManager(auth: AuthContext) {
    if (!isTenantAdmin(auth.role) && auth.role !== Role.FLEET_MANAGER) {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Only Fleet Managers or Admins can perform this action.');
    }
  }

  async create(auth: AuthContext, dto: CreateEquipmentDto): Promise<EquipmentDomain> {
    this.assertFleetManager(auth);

    const exists = await this.equipmentRepository.exists(auth.tenantId, { serialNumber: dto.serialNumber });
    if (exists) {
      throw new DomainException(ErrorCode.EQUIPMENT_DUPLICATE_SERIAL, HttpStatus.CONFLICT, `Equipment with serial number ${dto.serialNumber} already exists.`);
    }

    const equipment = await this.equipmentRepository.create(auth.tenantId, dto);

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'equipment.create',
      entityType: 'equipment',
      entityId: equipment.id,
      after: equipment as unknown as Record<string, unknown>,
    });

    return equipment;
  }

  async find(
    auth: AuthContext,
    filter: Record<string, unknown>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<EquipmentDomain>> {
    // Accessible by all users in tenant
    return this.equipmentRepository.find(auth.tenantId, filter, options);
  }

  async findById(auth: AuthContext, id: string): Promise<EquipmentDomain> {
    const equipment = await this.equipmentRepository.findById(auth.tenantId, id);
    if (!equipment) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Equipment not found');
    }
    return equipment;
  }

  async update(auth: AuthContext, id: string, dto: UpdateEquipmentDto): Promise<EquipmentDomain> {
    this.assertFleetManager(auth);

    const before = await this.findById(auth, id);

    if (dto.serialNumber && dto.serialNumber !== before.serialNumber) {
      const exists = await this.equipmentRepository.exists(auth.tenantId, { serialNumber: dto.serialNumber });
      if (exists) {
        throw new DomainException(ErrorCode.EQUIPMENT_DUPLICATE_SERIAL, HttpStatus.CONFLICT, `Equipment with serial number ${dto.serialNumber} already exists.`);
      }
    }

    const equipment = await this.equipmentRepository.update(auth.tenantId, id, dto);
    if (!equipment) throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Equipment not found');

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'equipment.update',
      entityType: 'equipment',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: equipment as unknown as Record<string, unknown>,
    });

    return equipment;
  }

  // --- Assignments ---

  async assign(auth: AuthContext, id: string, dto: AssignEquipmentDto): Promise<EquipmentAssignmentDomain> {
    // Must have project manager access to the target project
    await this.authzService.assertProjectManager(auth, auth.tenantId, dto.projectId);
    const equipment = await this.findById(auth, id);

    if (equipment.status === EquipmentStatus.MAINTENANCE || equipment.status === EquipmentStatus.RETIRED) {
      throw new DomainException(ErrorCode.EQUIPMENT_WRONG_STATUS, HttpStatus.CONFLICT, `Cannot assign equipment that is ${equipment.status}.`);
    }

    const hasOverlap = await this.assignmentRepository.hasOverlappingAssignment(
      auth.tenantId,
      id,
      new Date(dto.startDate),
      dto.endDate ? new Date(dto.endDate) : undefined,
    );

    if (hasOverlap) {
      throw new DomainException(ErrorCode.EQUIPMENT_ASSIGNMENT_CONFLICT, HttpStatus.CONFLICT, 'Equipment is already assigned during the requested period.');
    }

    const assignment = await this.assignmentRepository.create(auth.tenantId, {
      ...dto,
      equipmentId: id,
    });

    // Update equipment status if it was available
    if (equipment.status === EquipmentStatus.AVAILABLE) {
      await this.equipmentRepository.update(auth.tenantId, id, { status: EquipmentStatus.ASSIGNED });
    }

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'equipment.assignment.create',
      entityType: 'equipment',
      entityId: id,
      after: assignment as unknown as Record<string, unknown>,
    });

    return assignment;
  }

  async release(auth: AuthContext, id: string, assignmentId: string): Promise<void> {
    const assignment = await this.assignmentRepository.findById(auth.tenantId, assignmentId);
    if (!assignment || assignment.equipmentId !== id) {
      throw new DomainException(ErrorCode.EQUIPMENT_ASSIGNMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Assignment not found');
    }

    await this.authzService.assertProjectManager(auth, auth.tenantId, assignment.projectId);

    if (!assignment.active) {
      return;
    }

    await this.assignmentRepository.update(auth.tenantId, assignmentId, {
      active: false,
      endDate: new Date(),
    });

    // We should technically check if there are other active assignments before marking available.
    // Assuming simple logic for now: release marks it available if no other assignments are active.
    const activeCount = await this.assignmentRepository.count(auth.tenantId, { equipmentId: id, active: true });
    if (activeCount === 0) {
      await this.equipmentRepository.update(auth.tenantId, id, { status: EquipmentStatus.AVAILABLE });
    }

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'equipment.assignment.release',
      entityType: 'equipment',
      entityId: id,
      before: assignment as unknown as Record<string, unknown>,
    });
  }

  // --- Usage Logs ---

  async logUsage(auth: AuthContext, id: string, dto: CreateUsageLogDto): Promise<EquipmentUsageLogDomain> {
    await this.findById(auth, id); // Ensure equipment exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usagePayload = { ...(dto as CreateUsageLogDto), equipmentId: id } as CreateUsageLogDto & { equipmentId: string };
    const log = await this.usageLogRepository.create(auth.tenantId, usagePayload);
    return log;
  }

  /**
   * Correct a recorded usage entry (Hours Used is derived from these logs —
   * editing them is the supported way to change reported hours/utilization).
   * Mirrors logUsage's access rule (any authenticated tenant user) so the
   * person who logged hours can also correct them.
   */
  async updateUsageLog(
    auth: AuthContext,
    id: string,
    logId: string,
    dto: UpdateUsageLogDto,
  ): Promise<EquipmentUsageLogDomain> {
    await this.findById(auth, id); // Ensure equipment exists

    const before = await this.usageLogRepository.findById(auth.tenantId, logId);
    if (!before || before.equipmentId !== id) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Usage log not found');
    }

    const updated = await this.usageLogRepository.update(auth.tenantId, logId, dto);
    if (!updated) {
      throw new DomainException(ErrorCode.EQUIPMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Usage log not found');
    }

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'equipment.usage_log.update',
      entityType: 'equipment_usage_log',
      entityId: logId,
      before: before as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async getUsageLogs(auth: AuthContext, id: string, options: PaginationOptions): Promise<PaginatedResponse<EquipmentUsageLogDomain>> {
    return this.usageLogRepository.find(auth.tenantId, { equipmentId: id }, options);
  }

  async getUsageLogsByTask(auth: AuthContext, taskId: string, options: PaginationOptions): Promise<PaginatedResponse<EquipmentUsageLogDomain>> {
    return this.usageLogRepository.findByTask(auth.tenantId, taskId, options);
  }

  // --- Maintenance ---

  async scheduleMaintenance(auth: AuthContext, id: string, dto: CreateMaintenanceRecordDto): Promise<MaintenanceRecordDomain> {
    this.assertFleetManager(auth);
    await this.findById(auth, id); // Ensure equipment exists

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maintenancePayload = { ...(dto as CreateMaintenanceRecordDto), equipmentId: id } as CreateMaintenanceRecordDto & { equipmentId: string };
    const record = await this.maintenanceRepository.create(auth.tenantId, maintenancePayload);

    return record;
  }

  async updateMaintenance(auth: AuthContext, id: string, maintenanceId: string, dto: UpdateMaintenanceRecordDto): Promise<MaintenanceRecordDomain> {
    this.assertFleetManager(auth);
    
    // Convert dates before passing to repository
    const updateData = {
      ...dto,
      date: dto.date,
      nextDueAt: dto.nextDueAt,
    };
    // Clean up undefined properties if necessary, but Mongoose will handle them or we can just pass it directly since it's Partial
    
    const record = await this.maintenanceRepository.update(auth.tenantId, maintenanceId, updateData);
    if (!record || record.equipmentId !== id) {
      throw new DomainException(ErrorCode.MAINTENANCE_RECORD_NOT_FOUND, HttpStatus.NOT_FOUND, 'Maintenance record not found');
    }
    return record;
  }

  async getMaintenanceRecords(auth: AuthContext, id: string, options: PaginationOptions): Promise<PaginatedResponse<MaintenanceRecordDomain>> {
    return this.maintenanceRepository.find(auth.tenantId, { equipmentId: id }, options);
  }

  // --- Downtime ---

  async logDowntime(auth: AuthContext, id: string, dto: CreateDowntimeLogDto): Promise<DowntimeLogDomain> {
    this.assertFleetManager(auth); // Only fleet managers log formal downtime? Or project managers too. For now, fleet managers.
    await this.findById(auth, id); // Ensure equipment exists

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const downtimePayload = { ...(dto as CreateDowntimeLogDto), equipmentId: id } as CreateDowntimeLogDto & { equipmentId: string };
    const log = await this.downtimeLogRepository.create(auth.tenantId, downtimePayload);
    return log;
  }

  async getDowntimeLogs(auth: AuthContext, id: string, options: PaginationOptions): Promise<PaginatedResponse<DowntimeLogDomain>> {
    return this.downtimeLogRepository.find(auth.tenantId, { equipmentId: id }, options);
  }
}

