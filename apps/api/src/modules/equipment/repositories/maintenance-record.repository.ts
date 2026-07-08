import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MaintenanceRecord, MaintenanceRecordDocument } from '../../../schemas/maintenance-record.schema';
import { BaseRepository } from '../../../database/base.repository';
import { MaintenanceRecordDomain } from '@constructtrack/types';

@Injectable()
export class MaintenanceRecordRepository extends BaseRepository<MaintenanceRecordDocument, MaintenanceRecordDomain> {
  constructor(
    @InjectModel(MaintenanceRecord.name)
    model: Model<MaintenanceRecordDocument>,
  ) {
    super(model);
  }
}
