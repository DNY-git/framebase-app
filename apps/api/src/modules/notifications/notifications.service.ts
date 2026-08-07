import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { ErrorCode } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationSubscriptionRepository } from './repositories/notification-subscription.repository';
import { AuthContext } from '../../common/authorization/authorization.types';
import {
  NotificationDomain,
  NotificationSubscriptionDomain,
  NotificationType,
  NotificationChannel,
  PaginationOptions,
  PaginatedResponse,
} from '@constructtrack/types';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NotificationRepository) private readonly notifRepo: NotificationRepository,
    @Inject(NotificationSubscriptionRepository) private readonly subRepo: NotificationSubscriptionRepository,
  ) {}

  // ====== Notifications ======

  async create(auth: AuthContext, dto: CreateNotificationDto): Promise<NotificationDomain> {
    return this.notifRepo.create(auth.tenantId, dto);
  }

  async findMyNotifications(
    auth: AuthContext,
    options: PaginationOptions,
    unreadOnly = false,
  ): Promise<PaginatedResponse<NotificationDomain>> {
    return this.notifRepo.findByUser(auth.tenantId, auth.userId, options, unreadOnly);
  }

  async markAsRead(auth: AuthContext, notificationId: string): Promise<NotificationDomain> {
    const notification = await this.notifRepo.markAsRead(auth.tenantId, auth.userId, notificationId);
    if (!notification) throw new DomainException(ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Notification not found');
    return notification;
  }

  async markAllAsRead(auth: AuthContext): Promise<{ count: number }> {
    const count = await this.notifRepo.markAllAsRead(auth.tenantId, auth.userId);
    return { count };
  }

  async countUnread(auth: AuthContext): Promise<{ count: number }> {
    const count = await this.notifRepo.countUnread(auth.tenantId, auth.userId);
    return { count };
  }

  // ====== Subscriptions ======

  async findMySubscriptions(auth: AuthContext): Promise<NotificationSubscriptionDomain[]> {
    return this.subRepo.findByUser(auth.tenantId, auth.userId);
  }

  async upsertSubscription(
    auth: AuthContext,
    type: NotificationType,
    channels: NotificationChannel[],
  ): Promise<NotificationSubscriptionDomain> {
    return this.subRepo.upsert(auth.tenantId, auth.userId, type, channels);
  }

  async bulkUpsertSubscriptions(
    auth: AuthContext,
    subscriptions: Array<{ type: NotificationType; channels: NotificationChannel[] }>,
  ): Promise<NotificationSubscriptionDomain[]> {
    const results = await Promise.all(
      subscriptions.map((sub) =>
        this.subRepo.upsert(auth.tenantId, auth.userId, sub.type, sub.channels),
      ),
    );
    return results;
  }
}
