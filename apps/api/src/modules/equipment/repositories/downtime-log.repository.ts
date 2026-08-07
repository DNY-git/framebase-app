import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DowntimeLog, DowntimeLogDocument } from '../../../schemas/downtime-log.schema';
import { BaseRepository } from '../../../database/base.repository';
import { DowntimeLogDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateDowntimeLogDto } from '../dto/create-downtime-log.dto';
import { UpdateDowntimeLogDto } from '../dto/update-downtime-log.dto';

@Injectable()
export class DowntimeLogRepository extends BaseRepository<DowntimeLogDomain, DowntimeLogDocument, CreateDowntimeLogDto, UpdateDowntimeLogDto> {
  constructor(
    @InjectModel(DowntimeLog.name)
    model: Model<DowntimeLogDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: DowntimeLogDocument): DowntimeLogDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      equipmentId: doc.equipmentId,
      startDate: doc.startDate,
      endDate: doc.endDate,
      reason: doc.reason,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateDowntimeLogDto & { equipmentId?: string }): Partial<DowntimeLogDocument> {
    return {
      tenantId,
      equipmentId: data.equipmentId!,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      reason: data.reason,
      notes: data.notes,
    };
  }

  protected toUpdateDoc(data: UpdateDowntimeLogDto): Partial<DowntimeLogDocument> {
    const out: Partial<DowntimeLogDocument> = {};
    if (data.startDate) out.startDate = new Date(data.startDate);
    if (data.endDate) out.endDate = new Date(data.endDate);
    if (data.reason) out.reason = data.reason;
    if (data.notes !== undefined) out.notes = data.notes;
    return out;
  }

  /**
   * Get all downtime logs for an equipment within a date range.
   */
  async findByDateRange(
    tenantId: string,
    equipmentId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<DowntimeLogDomain[]> {
    const docs = await this.model.find({
      tenantId,
      equipmentId,
      startDate: { $lt: toDate },
      $or: [
        { endDate: { $gte: fromDate } },
        { endDate: { $exists: false } }, // Ongoing downtime
      ],
    });
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Get paginated downtime logs for an equipment.
   */
  async findByEquipment(
    tenantId: string,
    equipmentId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<DowntimeLogDomain>> {
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const skip = (page - 1) * perPage;

    const [docs, total] = await Promise.all([
      this.model
        .find({
          tenantId,
          equipmentId,
        })
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(perPage),
      this.model.countDocuments({
        tenantId,
        equipmentId,
      }),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems: total,
      totalPages: Math.ceil(total / perPage),
    };
  }
}
