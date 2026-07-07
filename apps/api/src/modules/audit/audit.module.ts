/**
 * Audit module — global provider of audit logging.
 *
 * Registered as @Global() so any feature module can inject AuditService
 * without importing this module explicitly. The AuditLog Mongoose model
 * is registered via MongooseModule.forFeature.
 */
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from '../../schemas/audit-log.schema';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
