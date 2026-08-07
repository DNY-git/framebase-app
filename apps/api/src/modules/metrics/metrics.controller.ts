import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@constructtrack/types';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Roles(Role.ADMIN)
  @Get()
  @Header('Content-Type', 'application/json')
  async index(): Promise<Record<string, unknown>> {
    return this.metricsService.snapshot();
  }
}
