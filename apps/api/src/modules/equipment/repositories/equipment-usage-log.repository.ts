import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentUsageLog, EquipmentUsageLogDocument } from '../../../schemas/equipment-usage-log.schema';
import { BaseRepository } from '../../../database/base.repository';
import { EquipmentUsageLogDomain } from '@constructtrack/types';
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
    if (data.operatorId !== undefined) out.operatorId = data.operatorId;
    if (data.notes !== undefined) out.notes = data.notes;
    return out;
  }
}
