/**
 * Organizations controller — HTTP layer for organization lifecycle,
 * team management, and invitations.
 *
 *   GET    /api/v1/organizations/me             → context + memberships
 *   POST   /api/v1/organizations                → create org (OWNER) + tokens
 *   POST   /api/v1/organizations/switch         → switch active org + tokens
 *   GET    /api/v1/organizations/members        → team list (OWNER/ADMIN)
 *   PATCH  /api/v1/organizations/members/:userId → change role (OWNER/ADMIN)
 *   DELETE /api/v1/organizations/members/:userId → remove member (OWNER/ADMIN)
 *   POST   /api/v1/organizations/invitations    → invite (OWNER/ADMIN)
 *   GET    /api/v1/organizations/invitations    → list (OWNER/ADMIN)
 *   DELETE /api/v1/organizations/invitations/:id → revoke (OWNER/ADMIN)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@constructtrack/types';
import { OrganizationsService, type RequestMeta } from './organizations.service';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { SwitchOrganizationDto } from './dto/switch-organization.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';

const MANAGE_ROLES = (): Role[] => [Role.OWNER, Role.ADMIN];

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  private extractMeta(req: Request): RequestMeta {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress:
        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]
          ?.trim() ?? req.ip,
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? '',
    };
  }

  @Get('me')
  async getContext(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.organizationsService.getContext(user) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    const result = await this.organizationsService.createOrganization(
      user,
      dto.name,
      this.extractMeta(req),
    );
    return { data: result };
  }

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  async switchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchOrganizationDto,
    @Req() req: Request,
  ) {
    const result = await this.organizationsService.switchOrganization(
      user,
      dto.tenantId,
      this.extractMeta(req),
    );
    return { data: result };
  }

  // -------------------------------------------------------------------------
  // Team / members — OWNER/ADMIN only
  // -------------------------------------------------------------------------

  @Get('members')
  @Roles(...MANAGE_ROLES())
  async listMembers(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.organizationsService.listMembers(user) };
  }

  /**
   * Read-only member directory for project assignment. PROJECT_MANAGER+
   * (Phase 6 — project managers must be able to add org members to
   * projects without gaining team-management powers).
   */
  @Get('directory')
  @Roles(Role.OWNER, Role.ADMIN, Role.PROJECT_MANAGER)
  async listDirectory(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.organizationsService.listDirectory(user) };
  }

  @Patch('members/:userId')
  @Roles(...MANAGE_ROLES())
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return {
      data: await this.organizationsService.updateMemberRole(user, userId, dto.role),
    };
  }

  @Delete('members/:userId')
  @Roles(...MANAGE_ROLES())
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.organizationsService.removeMember(user, userId);
  }

  // -------------------------------------------------------------------------
  // Invitations — OWNER/ADMIN only
  // -------------------------------------------------------------------------

  @Post('invitations')
  @Roles(...MANAGE_ROLES())
  @HttpCode(HttpStatus.CREATED)
  async createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return {
      data: await this.organizationsService.createInvitation(
        user,
        dto.email,
        dto.role,
        dto.expiresAt,
        dto.usageLimit ?? null,
      ),
    };
  }

  @Get('invitations')
  @Roles(...MANAGE_ROLES())
  async listInvitations(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.organizationsService.listInvitations(user) };
  }

  @Patch('invitations/:id')
  @Roles(...MANAGE_ROLES())
  async updateInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invitationId: string,
    @Body() dto: UpdateInvitationDto,
  ) {
    return {
      data: await this.organizationsService.updateInvitation(user, invitationId, dto.expiresAt, dto.usageLimit ?? null),
    };
  }

  @Delete('invitations/:id')
  @Roles(...MANAGE_ROLES())
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invitationId: string,
  ): Promise<void> {
    await this.organizationsService.revokeInvitation(user, invitationId);
  }
}