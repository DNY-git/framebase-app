import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentUsageLog, EquipmentUsageLogDocument } from '../../../schemas/equipment-usage-log.schema';
import { BaseRepository } from '../../../database/base.repository';
import { EquipmentUsageLogDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateUsageLogDto } from '../dto/create-usage-log.dto';

@Injectable()
export class EquipmentUsageLogRepository extends BaseRepository<EquipmentUsageLogDomain, EquipmentUsageLogDocument, CreateUsageLogDto, Partial<CreateUsageLogDto>> {
  constructor(
    @InjectModel(EquipmentUsageLog.name)
    model: Model<EquipmentUsageLogDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: EquipmentUsageLogDocument): EquipmentUsageLogDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      equipmentId: doc.equipmentId,
      taskId: doc.taskId,
      date: doc.date,
      hoursUsed: doc.hoursUsed,
      operatorId: doc.operatorId,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateUsageLogDto & { equipmentId?: string }): Partial<EquipmentUsageLogDocument> {
    return {
      tenantId,
      equipmentId: data.equipmentId!,
      taskId: data.taskId,
      date: new Date(data.date),
      hoursUsed: data.hoursUsed,
      operatorId: data.operatorId,
      notes: data.notes,
    };
  }

  protected toUpdateDoc(data: Partial<CreateUsageLogDto>): Partial<EquipmentUsageLogDocument> {
    const out: Partial<EquipmentUsageLogDocument> = {};
    if (data.date) out.date = new Date(data.date);
    if (typeof data.hoursUsed === 'number') out.hoursUsed = data.hoursUsed;
    if (data.taskId !== undefined) out.taskId = data.taskId;
    if (data.operatorId !== undefined) out.operatorId = data.operatorId;
    if (data.notes !== undefined) out.notes = data.notes;
    return out;
  }

  /**
   * Get all usage logs for an equipment within a date range.
   */
  async findByDateRange(
    tenantId: string,
    equipmentId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<EquipmentUsageLogDomain[]> {
    const docs = await this.model.find({
      tenantId,
      equipmentId,
      date: { $gte: fromDate, $lt: toDate },
    });
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Get paginated usage logs for a task.
   */
  async findByTask(
    tenantId: string,
    taskId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<EquipmentUsageLogDomain>> {
    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const filter = { tenantId, taskId };
    const [docs, totalItems] = await Promise.all([
      this.model.find(filter).sort({ date: -1 }).skip(skip).limit(perPage).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  /**
   * Get paginated usage logs for an equipment within a date range.
   */
  async findByDateRangePaginated(
    tenantId: string,
    equipmentId: string,
    fromDate: Date,
    toDate: Date,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<EquipmentUsageLogDomain>> {
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const skip = (page - 1) * perPage;

    const [docs, total] = await Promise.all([
      this.model
        .find({
          tenantId,
          equipmentId,
          date: { $gte: fromDate, $lt: toDate },
        })
        .sort({ date: -1 })
        .skip(skip)
        .limit(perPage),
      this.model.countDocuments({
        tenantId,
        equipmentId,
        date: { $gte: fromDate, $lt: toDate },
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
