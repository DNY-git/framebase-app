import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@constructtrack/types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ====== Templates ======

  @Post('templates')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportTemplateDto) {
    const template = await this.reportsService.createTemplate(user, dto);
    return { data: template };
  }

  @Get('templates')
  async findTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.reportsService.findTemplates(user, options);
    return formatPaginatedResponse(result);
  }

  @Get('templates/:id')
  async findTemplateById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const template = await this.reportsService.findTemplateById(user, id);
    return { data: template };
  }

  // ====== Runs ======

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async generateReport(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateReportDto) {
    const run = await this.reportsService.generateReport(user, dto);
    return { data: run, meta: { status: run.status } };
  }

  @Get()
  async findRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Query('templateId') templateId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const filter: Record<string, unknown> = {};
    if (templateId) filter.templateId = templateId;
    if (status) filter.status = status;
    const result = await this.reportsService.findRuns(user, options, filter);
    return formatPaginatedResponse(result);
  }

  @Get(':id')
  async findRunById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const run = await this.reportsService.findRunById(user, id);
    return { data: run };
  }
}
