import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Notification, NotificationDocument } from '../../../schemas/notification.schema';
import { BaseRepository } from '../../../database/base.repository';
import { NotificationDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateNotificationDto } from '../dto/create-notification.dto';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationDomain, NotificationDocument, CreateNotificationDto, Partial<NotificationDomain>> {
  constructor(
    @InjectModel(Notification.name)
    model: Model<NotificationDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: NotificationDocument): NotificationDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      userId: doc.userId.toString(),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      payload: doc.payload,
      link: doc.link,
      readAt: doc.readAt,
      createdAt: doc.createdAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateNotificationDto): Partial<NotificationDocument> {
    return {
      tenantId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      payload: data.payload ?? {},
      link: data.link,
    };
  }

  protected toUpdateDoc(data: Partial<NotificationDomain>): Partial<NotificationDocument> {
    const out: Partial<NotificationDocument> = {};
    if (data.readAt !== undefined) out.readAt = data.readAt;
    return out;
  }

  async findByUser(
    tenantId: string,
    userId: string,
    options: PaginationOptions,
    unreadOnly = false,
  ): Promise<PaginatedResponse<NotificationDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const query: FilterQuery<NotificationDocument> = {
      tenantId,
      userId,
    } as FilterQuery<NotificationDocument>;
    if (unreadOnly) query.readAt = null;

    const [docs, totalItems] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string): Promise<NotificationDomain | null> {
    const doc = await this.model.findOneAndUpdate(
      { _id: notificationId, tenantId, userId } as FilterQuery<NotificationDocument>,
      { $set: { readAt: new Date() } },
      { new: true },
    ).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const result = await this.model.updateMany(
      { tenantId, userId, readAt: null } as FilterQuery<NotificationDocument>,
      { $set: { readAt: new Date() } },
    ).exec();
    return result.modifiedCount;
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.model.countDocuments({
      tenantId,
      userId,
      readAt: null,
    } as FilterQuery<NotificationDocument>).exec();
  }
}
