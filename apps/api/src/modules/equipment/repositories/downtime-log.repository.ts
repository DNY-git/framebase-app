import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DowntimeLog, DowntimeLogDocument } from '../../../schemas/downtime-log.schema';
import { BaseRepository } from '../../../database/base.repository';
import { DowntimeLogDomain } from '@constructtrack/types';

@Injectable()
export class DowntimeLogRepository extends BaseRepository<DowntimeLogDocument, DowntimeLogDomain> {
  constructor(
    @InjectModel(DowntimeLog.name)
    model: Model<DowntimeLogDocument>,
  ) {
    super(model);
  }
}
