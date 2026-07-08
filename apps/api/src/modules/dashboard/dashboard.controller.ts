import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, CurrentTenant } from '../../common/decorators/current-user.decorator';
import { AuthContext } from '../../common/authorization/authorization.types';
import { DashboardOverview, Role } from '@constructtrack/types';
import type { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';

@Controller('v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<DashboardOverview> {
    const auth: AuthContext = {
      userId: user.userId,
      tenantId: tenantId,
      role: user.role as Role,
    };
    return this.dashboardService.getOverview(auth);
  }
}
