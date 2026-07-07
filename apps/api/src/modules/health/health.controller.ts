/**
 * Health check controller.
 *
 * GET /api/v1/health — returns aggregated subsystem health.
 *
 * This endpoint is excluded from the standard response envelope because
 * health probes (load balancers, orchestrators) expect a raw status object.
 * The endpoint always returns 200; degraded subsystems are reported in
 * the response body, not via HTTP status.
 *
 * Marked @Public() so load balancers can probe without a JWT.
 */
import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthCheckResult } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
