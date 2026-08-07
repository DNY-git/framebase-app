import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { EquipmentReportService } from './equipment-report.service';
import { EquipmentRepository } from './repositories/equipment.repository';
import { EquipmentAssignmentRepository } from './repositories/equipment-assignment.repository';
import { Equipment, EquipmentSchema } from '../../schemas/equipment.schema';
import { EquipmentAssignment, EquipmentAssignmentSchema } from '../../schemas/equipment-assignment.schema';
import { EquipmentUsageLog, EquipmentUsageLogSchema } from '../../schemas/equipment-usage-log.schema';
import { MaintenanceRecord, MaintenanceRecordSchema } from '../../schemas/maintenance-record.schema';
import { DowntimeLog, DowntimeLogSchema } from '../../schemas/downtime-log.schema';
import { EquipmentUsageLogRepository } from './repositories/equipment-usage-log.repository';
import { MaintenanceRecordRepository } from './repositories/maintenance-record.repository';
import { DowntimeLogRepository } from './repositories/downtime-log.repository';
import { AuthorizationModule } from '../../common/authorization/authorization.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Equipment.name, schema: EquipmentSchema },
      { name: EquipmentAssignment.name, schema: EquipmentAssignmentSchema },
      { name: EquipmentUsageLog.name, schema: EquipmentUsageLogSchema },
      { name: MaintenanceRecord.name, schema: MaintenanceRecordSchema },
      { name: DowntimeLog.name, schema: DowntimeLogSchema },
    ]),
    AuthorizationModule,
  ],
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    EquipmentReportService,
    EquipmentRepository,
    EquipmentAssignmentRepository,
    EquipmentUsageLogRepository,
    MaintenanceRecordRepository,
    DowntimeLogRepository,
  ],
  exports: [EquipmentService, EquipmentReportService],
})
export class EquipmentModule {}
