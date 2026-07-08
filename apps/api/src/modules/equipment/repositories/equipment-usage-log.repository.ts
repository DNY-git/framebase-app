import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentUsageLog, EquipmentUsageLogDocument } from '../../../schemas/equipment-usage-log.schema';
import { BaseRepository } from '../../../database/base.repository';
import { EquipmentUsageLogDomain } from '@constructtrack/types';

@Injectable()
export class EquipmentUsageLogRepository extends BaseRepository<EquipmentUsageLogDocument, EquipmentUsageLogDomain> {
  constructor(
    @InjectModel(EquipmentUsageLog.name)
    model: Model<EquipmentUsageLogDocument>,
  ) {
    super(model);
  }
}
