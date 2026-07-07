import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  // DatabaseModule is imported at the AppModule level (global).
  // HealthModule only needs to provide its own controller + service.
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
