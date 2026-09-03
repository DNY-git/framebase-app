import { Controller, Get, Query } from '@nestjs/common';
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
    @Query('days') days?: string,
    @Query('range') range?: string,
  ): Promise<DashboardOverview> {
    const parsedDays = days ? parseInt(days, 10) : undefined;
    // Support range presets: 1d,7d,30d,90d,6m,1y
    const rangeMap: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '6m': 180, '1y': 365, '1y': 365 };
    const daysFromRange = range ? rangeMap[range] : undefined;
    const finalDays = Number.isFinite(parsedDays) ? parsedDays : daysFromRange;
    return this.dashboardService.getOverview({ ...user, tenantId }, finalDays);
  }
}
