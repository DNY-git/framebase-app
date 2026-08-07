import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';

@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly auditService: AuditService,
    private readonly authzService: AuthorizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(user, projectId, dto);
    return { data: task };
  }

  @Get()
  async find(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (priority) filter.priority = priority;

    const result = await this.tasksService.find(user, projectId, filter, options);
    return formatPaginatedResponse(result);
  }

  @Get(':taskId')
  async findById(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const task = await this.tasksService.findById(user, projectId, taskId);
    return { data: task };
  }

  @Patch(':taskId')
  async update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user, projectId, taskId, dto);
    return { data: task };
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.tasksService.delete(user, projectId, taskId);
  }

  @Get(':taskId/activity')
  async getActivity(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    // Assert project access first
    await this.authzService.assertProjectAccess(user, user.tenantId, projectId);
    // Verify task belongs to project
    await this.tasksService.findById(user, projectId, taskId);

    const options = parsePagination(page, perPage);

    const result = await this.auditService.findByEntity(user.tenantId, 'task', taskId, options);
    
    return formatPaginatedResponse(result);
  }

  // -------------------------------------------------------------------------
  // Dependencies
  // -------------------------------------------------------------------------

  @Get(':taskId/dependencies')
  async getDependencies(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const deps = await this.tasksService.getDependencies(user, projectId, taskId);
    return { data: deps };
  }

  @Post(':taskId/dependencies/:predecessorId')
  @HttpCode(HttpStatus.CREATED)
  async addDependency(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('predecessorId') predecessorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dep = await this.tasksService.addDependency(user, projectId, taskId, predecessorId);
    return { data: dep };
  }

  @Delete(':taskId/dependencies/:predecessorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDependency(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('predecessorId') predecessorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.tasksService.removeDependency(user, projectId, taskId, predecessorId);
  }

  // -------------------------------------------------------------------------
  // Resource Consumption (T-205)
  // -------------------------------------------------------------------------

  @Post(':taskId/equipment-usage')
  @HttpCode(HttpStatus.CREATED)
  async recordEquipmentUsage(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { equipmentId: string; date: string; hoursUsed: number },
  ) {
    const log = await this.tasksService.recordEquipmentUsage(
      user,
      projectId,
      taskId,
      body.equipmentId,
      body.date,
      body.hoursUsed,
    );
    return { data: log };
  }

  @Get(':taskId/equipment-usage')
  async getEquipmentUsage(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.tasksService.getEquipmentUsage(
      user,
      projectId,
      taskId,
      options,
    );
    return formatPaginatedResponse(result);
  }

  @Post(':taskId/material-consumption')
  @HttpCode(HttpStatus.CREATED)
  async recordMaterialConsumption(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { materialId: string; quantity: number },
  ) {
    const tx = await this.tasksService.recordMaterialConsumption(
      user,
      projectId,
      taskId,
      body.materialId,
      body.quantity,
    );
    return { data: tx };
  }

  @Get(':taskId/material-consumption')
  async getMaterialConsumption(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.tasksService.getMaterialConsumption(
      user,
      projectId,
      taskId,
      options,
    );
    return formatPaginatedResponse(result);
  }
}
