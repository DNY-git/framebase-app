import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { AssignEquipmentDto } from './dto/assign-equipment.dto';
import { CreateUsageLogDto } from './dto/create-usage-log.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { CreateDowntimeLogDto } from './dto/create-downtime-log.dto';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { AuthContext } from '../../common/authorization/authorization.types';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@constructtrack/types';

@Controller('v1/equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEquipmentDto) {
    const equipment = await this.equipmentService.create(user as unknown as AuthContext, dto);
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

    const result = await this.equipmentService.find(user as unknown as AuthContext, filter, options);
    return formatPaginatedResponse(result);
  }

  @Get(':id')
  async findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const equipment = await this.equipmentService.findById(user as unknown as AuthContext, id);
    return { data: equipment };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    const equipment = await this.equipmentService.update(user as unknown as AuthContext, id, dto);
    return { data: equipment };
  }

  @Post(':id/assignments')
  @HttpCode(HttpStatus.CREATED)
  async assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignEquipmentDto) {
    const assignment = await this.equipmentService.assign(user as unknown as AuthContext, id, dto);
    return { data: assignment };
  }

  @Delete(':id/assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    await this.equipmentService.release(user as unknown as AuthContext, id, assignmentId);
  }

  // --- Usage Logs ---

  @Post(':id/usage')
  @HttpCode(HttpStatus.CREATED)
  async logUsage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateUsageLogDto) {
    const log = await this.equipmentService.logUsage(user as unknown as AuthContext, id, dto);
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
    const result = await this.equipmentService.getUsageLogs(user as unknown as AuthContext, id, options);
    return formatPaginatedResponse(result);
  }

  // --- Maintenance ---

  @Post(':id/maintenance')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async scheduleMaintenance(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateMaintenanceRecordDto) {
    const record = await this.equipmentService.scheduleMaintenance(user as unknown as AuthContext, id, dto);
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
    const record = await this.equipmentService.updateMaintenance(user as unknown as AuthContext, id, maintenanceId, dto);
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
    const result = await this.equipmentService.getMaintenanceRecords(user as unknown as AuthContext, id, options);
    return formatPaginatedResponse(result);
  }

  // --- Downtime ---

  @Post(':id/downtime')
  @Roles(Role.ADMIN, Role.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async logDowntime(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateDowntimeLogDto) {
    const log = await this.equipmentService.logDowntime(user as unknown as AuthContext, id, dto);
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
    const result = await this.equipmentService.getDowntimeLogs(user as unknown as AuthContext, id, options);
    return formatPaginatedResponse(result);
  }
}

