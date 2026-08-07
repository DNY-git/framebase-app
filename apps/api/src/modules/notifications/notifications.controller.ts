import { Controller, Get, Post, Patch, Put, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, NotificationType, NotificationChannel } from '@constructtrack/types';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpsertSubscriptionsDto } from './dto/upsert-subscriptions.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ====== Notifications ======

  @Post()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(user, dto);
    return { data: notification };
  }

  @Get()
  async findMyNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unread') unread?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const unreadOnly = unread === 'true';
    const result = await this.notificationsService.findMyNotifications(user, options, unreadOnly);
    return formatPaginatedResponse(result);
  }

  @Get('unread-count')
  async countUnread(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notificationsService.countUnread(user);
    return { data: result };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(user, id);
    return { data: notification };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notificationsService.markAllAsRead(user);
    return { data: result };
  }

  // ====== Subscriptions ======

  @Get('subscriptions')
  async findMySubscriptions(@CurrentUser() user: AuthenticatedUser) {
    const subscriptions = await this.notificationsService.findMySubscriptions(user);
    return { data: subscriptions };
  }

  @Put('subscriptions')
  @HttpCode(HttpStatus.OK)
  async upsertSubscriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSubscriptionsDto,
  ) {
    const subscriptions = await this.notificationsService.bulkUpsertSubscriptions(
      user,
      dto.subscriptions as Array<{ type: NotificationType; channels: NotificationChannel[] }>,
    );
    return { data: subscriptions };
  }
}
