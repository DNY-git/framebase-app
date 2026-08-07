import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationSubscription, NotificationSubscriptionDocument } from '../../../schemas/notification-subscription.schema';
import { BaseRepository } from '../../../database/base.repository';
import { NotificationSubscriptionDomain, NotificationType, NotificationChannel, TenantId } from '@constructtrack/types';

@Injectable()
export class NotificationSubscriptionRepository extends BaseRepository<
  NotificationSubscriptionDomain,
  NotificationSubscriptionDocument,
  { type: NotificationType; channels: NotificationChannel[] },
  Partial<NotificationSubscriptionDomain>
> {
  constructor(
    @InjectModel(NotificationSubscription.name)
    model: Model<NotificationSubscriptionDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: NotificationSubscriptionDocument): NotificationSubscriptionDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      userId: doc.userId.toString(),
      type: doc.type,
      channels: doc.channels,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: string,
    data: { type: NotificationType; channels: NotificationChannel[] },
  ): Partial<NotificationSubscriptionDocument> {
    return {
      tenantId,
      userId: '',
      type: data.type,
      channels: data.channels,
    };
  }

  protected toUpdateDoc(data: Partial<NotificationSubscriptionDomain>): Partial<NotificationSubscriptionDocument> {
    const out: Partial<NotificationSubscriptionDocument> = {};
    if (data.channels !== undefined) out.channels = data.channels;
    return out;
  }

  async findByUser(tenantId: TenantId, userId: string): Promise<NotificationSubscriptionDomain[]> {
    const docs = await this.model.find({
      tenantId,
      userId,
    }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async upsert(
    tenantId: string,
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
  ): Promise<NotificationSubscriptionDomain> {
    const doc = await this.model.findOneAndUpdate(
      { tenantId, userId, type },
      { $set: { channels } },
      { upsert: true, new: true },
    ).exec();
    return this.toDomain(doc);
  }
}
