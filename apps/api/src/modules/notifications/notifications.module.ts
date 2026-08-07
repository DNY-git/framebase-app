import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from '../../schemas/notification.schema';
import { NotificationSubscription, NotificationSubscriptionSchema } from '../../schemas/notification-subscription.schema';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationSubscriptionRepository } from './repositories/notification-subscription.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationSubscription.name, schema: NotificationSubscriptionSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRepository, NotificationSubscriptionRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
