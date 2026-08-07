import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MaintenanceRecord, MaintenanceRecordDocument } from '../../../schemas/maintenance-record.schema';
import { BaseRepository } from '../../../database/base.repository';
import { MaintenanceRecordDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateMaintenanceRecordDto } from '../dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from '../dto/update-maintenance-record.dto';

@Injectable()
export class MaintenanceRecordRepository extends BaseRepository<MaintenanceRecordDomain, MaintenanceRecordDocument, CreateMaintenanceRecordDto, UpdateMaintenanceRecordDto> {
  constructor(
    @InjectModel(MaintenanceRecord.name)
    model: Model<MaintenanceRecordDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: MaintenanceRecordDocument): MaintenanceRecordDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      equipmentId: doc.equipmentId,
      type: doc.type,
      status: doc.status,
      date: doc.date,
      nextDueAt: doc.nextDueAt,
      costCents: doc.costCents,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: CreateMaintenanceRecordDto & { equipmentId?: string }): Partial<MaintenanceRecordDocument> {
    return {
      tenantId,
      equipmentId: data.equipmentId!,
      type: data.type,
      status: data.status,
      date: data.date ? new Date(data.date) : undefined,
      nextDueAt: data.nextDueAt ? new Date(data.nextDueAt) : undefined,
      costCents: data.costCents,
      notes: data.notes,
    };
  }

  protected toUpdateDoc(data: UpdateMaintenanceRecordDto): Partial<MaintenanceRecordDocument> {
    const out: Partial<MaintenanceRecordDocument> = {};
    if (data.type) out.type = data.type;
    if (data.status) out.status = data.status;
    if (data.date) out.date = new Date(data.date);
    if (data.nextDueAt) out.nextDueAt = new Date(data.nextDueAt);
    if (data.costCents !== undefined) out.costCents = data.costCents;
    if (data.notes !== undefined) out.notes = data.notes;
    return out;
  }

  /**
   * Find maintenance records by status (e.g., PENDING, COMPLETED).
   */
  async findByStatus(
    tenantId: string,
    status: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<MaintenanceRecordDomain>> {
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const skip = (page - 1) * perPage;

    const [docs, total] = await Promise.all([
      this.model
        .find({
          tenantId,
          status,
        })
        .sort({ nextDueAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(perPage),
      this.model.countDocuments({
        tenantId,
        status,
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

  /**
   * Find maintenance records for a specific equipment.
   */
  async findByEquipment(
    tenantId: string,
    equipmentId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<MaintenanceRecordDomain>> {
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const skip = (page - 1) * perPage;

    const [docs, total] = await Promise.all([
      this.model
        .find({
          tenantId,
          equipmentId,
        })
        .sort({ nextDueAt: -1, date: -1 })
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
