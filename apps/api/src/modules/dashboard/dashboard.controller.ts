import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, CurrentTenant } from '../../common/decorators/current-user.decorator';
import type { DashboardOverview } from '@constructtrack/types';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<DashboardOverview> {
    return this.dashboardService.getOverview({ ...user, tenantId });
  }
}
