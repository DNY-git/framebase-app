import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentReportService } from './equipment-report.service';
import { EquipmentCatalogService } from './equipment-catalog.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { AssignEquipmentDto } from './dto/assign-equipment.dto';
import { CreateUsageLogDto } from './dto/create-usage-log.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { CreateDowntimeLogDto } from './dto/create-downtime-log.dto';
import { UtilizationQueryDto, UpcomingMaintenanceQueryDto } from './dto/utilization-query.dto';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@constructtrack/types';

@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly reportService: EquipmentReportService,
    private readonly catalogService: EquipmentCatalogService,
  ) {}

  /**
   * GET /v1/equipment/catalog — pre-built construction equipment types.
   * Declared before the `:id` routes so "catalog" is not captured as an id.
   */
  @Get('catalog')
  async getCatalog(@CurrentUser() _user: AuthenticatedUser) {
    const items = await this.catalogService.list();
    return { data: items };
  }

  @Post()
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEquipmentDto) {
    const equipment = await this.equipmentService.create(user, dto);
    return { data: equipment };
  }

  @Get()
  async find(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const result = await this.equipmentService.find(user, filter, options);
    return formatPaginatedResponse(result);
  }

  @Get(':id')
  async findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const equipment = await this.equipmentService.findById(user, id);
    return { data: equipment };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    const equipment = await this.equipmentService.update(user, id, dto);
    return { data: equipment };
  }

  @Post(':id/assignments')
  @HttpCode(HttpStatus.CREATED)
  async assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignEquipmentDto) {
    const assignment = await this.equipmentService.assign(user, id, dto);
    return { data: assignment };
  }

  @Delete(':id/assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    await this.equipmentService.release(user, id, assignmentId);
  }

  // --- Usage Logs ---

  @Post(':id/usage')
  @HttpCode(HttpStatus.CREATED)
  async logUsage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateUsageLogDto) {
    const log = await this.equipmentService.logUsage(user, id, dto);
    return { data: log };
  }

  @Get(':id/usage')
  async getUsageLogs(
    @CurrentUser() user: AuthenticatedUser, 
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.equipmentService.getUsageLogs(user, id, options);
    return formatPaginatedResponse(result);
  }

  // --- Maintenance ---

  @Post(':id/maintenance')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async scheduleMaintenance(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateMaintenanceRecordDto) {
    const record = await this.equipmentService.scheduleMaintenance(user, id, dto);
    return { data: record };
  }

  @Patch(':id/maintenance/:maintenanceId')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  async updateMaintenance(
    @CurrentUser() user: AuthenticatedUser, 
    @Param('id') id: string, 
    @Param('maintenanceId') maintenanceId: string, 
    @Body() dto: UpdateMaintenanceRecordDto
  ) {
    const record = await this.equipmentService.updateMaintenance(user, id, maintenanceId, dto);
    return { data: record };
  }

  @Get(':id/maintenance')
  async getMaintenanceRecords(
    @CurrentUser() user: AuthenticatedUser, 
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.equipmentService.getMaintenanceRecords(user, id, options);
    return formatPaginatedResponse(result);
  }

  // --- Downtime ---

  @Post(':id/downtime')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async logDowntime(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateDowntimeLogDto) {
    const log = await this.equipmentService.logDowntime(user, id, dto);
    return { data: log };
  }

  @Get(':id/downtime')
  async getDowntimeLogs(
    @CurrentUser() user: AuthenticatedUser, 
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.equipmentService.getDowntimeLogs(user, id, options);
    return formatPaginatedResponse(result);
  }

  // ===== T-202: Equipment Reporting & Utilization =====

  /**
   * GET /v1/equipment/:id/utilization?from=2026-07-01&to=2026-07-31
   * Calculate utilization for equipment over a date range.
   */
  @Get(':id/utilization')
  async getUtilization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: UtilizationQueryDto,
  ) {
    const utilization = await this.reportService.getUtilization(
      user.tenantId,
      id,
      new Date(query.from),
      new Date(query.to),
    );
    return { data: utilization };
  }

  /**
   * GET /v1/equipment/maintenance/upcoming?days=30
   * Get fleet-wide upcoming maintenance alerts.
   */
  @Get('maintenance/upcoming')
  async getUpcomingMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UpcomingMaintenanceQueryDto,
  ) {
    const alerts = await this.reportService.getUpcomingMaintenance(user.tenantId, query.days ?? 30);
    return { data: alerts };
  }

  /**
   * GET /v1/equipment/:id/usage-timeline?from=2026-07-01&to=2026-07-31&page=1&perPage=20
   * Get detailed usage timeline for an equipment over a date range.
   */
  @Get(':id/usage-timeline')
  async getUsageTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: UtilizationQueryDto,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const timeline = await this.reportService.getUsageTimeline(
      user.tenantId,
      id,
      new Date(query.from),
      new Date(query.to),
      options,
    );
    return formatPaginatedResponse(timeline);
  }

  /**
   * GET /v1/equipment/:id/maintenance-history?page=1&perPage=20
   * Get maintenance history for an equipment.
   */
  @Get(':id/maintenance-history')
  async getMaintenanceHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const history = await this.reportService.getMaintenanceHistory(
      user.tenantId,
      id,
      options,
    );
    return formatPaginatedResponse(history);
  }

  /**
   * GET /v1/equipment/:id/downtime-history?page=1&perPage=20
   * Get downtime history for an equipment.
   */
  @Get(':id/downtime-history')
  async getDowntimeHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const history = await this.reportService.getDowntimeHistory(
      user.tenantId,
      id,
      options,
    );
    return formatPaginatedResponse(history);
  }
}
