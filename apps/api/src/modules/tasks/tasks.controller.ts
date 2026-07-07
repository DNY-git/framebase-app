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
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser, CurrentTenant } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { TenantId } from '@constructtrack/types';
import type { AuthContext } from '../../common/authorization/authorization.types';

@Controller('v1/projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(user as unknown as AuthContext, projectId, dto);
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
    const options = {
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (priority) filter.priority = priority;

    const result = await this.tasksService.find(user as unknown as AuthContext, projectId, filter, options);
    return {
      data: result.items,
      meta: {
        pagination: {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get(':taskId')
  async findById(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const task = await this.tasksService.findById(user as unknown as AuthContext, projectId, taskId);
    return { data: task };
  }

  @Patch(':taskId')
  async update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user as unknown as AuthContext, projectId, taskId, dto);
    return { data: task };
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.tasksService.delete(user as unknown as AuthContext, projectId, taskId);
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
    const deps = await this.tasksService.getDependencies(user as unknown as AuthContext, projectId, taskId);
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
    const dep = await this.tasksService.addDependency(user as unknown as AuthContext, projectId, taskId, predecessorId);
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
    await this.tasksService.removeDependency(user as unknown as AuthContext, projectId, taskId, predecessorId);
  }
}
