/**
 * Projects controller — HTTP layer for the Projects domain.
 *
 * Thin translation between HTTP and the ProjectsService. Authorization
 * is checked both at the route level (@Roles) and in the service/authorization
 * layer (project membership). Responses follow the standard envelope
 * (docs/api/standards.md).
 *
 * See docs/features/projects.md and docs/api/endpoints.md → Projects.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../../common/authorization/authorization.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators/auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TenantId, EntityId } from '@constructtrack/types';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly authzService: AuthorizationService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(user, dto);
    return { data: project };
  }

  @Get()
  async find(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const options = parsePagination(page, perPage);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const result = await this.projectsService.find(user, filter, options);
    return formatPaginatedResponse(result);
  }

  @Get(':id')
  async findById(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: EntityId,
  ) {
    const project = await this.projectsService.findById(user, id);
    return { data: project };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  async update(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: EntityId,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(user, id, dto);
    return { data: project };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: EntityId,
  ) {
    await this.projectsService.delete(user, id);
  }

  @Get(':id/activity')
  async getActivity(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: EntityId,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    await this.authzService.assertProjectAccess(user, tenantId, id as string);

    const options = parsePagination(page, perPage);

    const result = await this.auditService.findByEntity(tenantId as string, 'project', id as string, options);
    
    return formatPaginatedResponse(result);
  }

  // -------------------------------------------------------------------------
  // Member Management — /v1/projects/:projectId/members
  // -------------------------------------------------------------------------

  @Get(':projectId/members')
  async listMembers(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    const members = await this.projectsService.listMembers(user, projectId);
    return { data: members };
  }

  @Post(':projectId/members')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectMemberDto,
  ) {
    const member = await this.projectsService.addMember(
      user,
      projectId,
      dto.userId,
      dto.role,
    );
    return { data: member };
  }

  @Patch(':projectId/members/:userId')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  async updateMemberRole(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    const member = await this.projectsService.updateMemberRole(
      user,
      projectId,
      userId,
      dto.role,
    );
    return { data: member };
  }

  @Delete(':projectId/members/:userId')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentTenant() tenantId: TenantId,
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    await this.projectsService.removeMember(
      user,
      projectId,
      userId,
    );
  }
}
