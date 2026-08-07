import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { QueryDto } from './dto/query.dto';
import { SubmitJobDto } from './dto/submit-job.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { AiJobType } from '@constructtrack/types';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@CurrentUser() user: AuthenticatedUser, @Body() dto: QueryDto) {
    const result = await this.aiService.query(user, dto);
    return { data: result };
  }

  @Post('summarize')
  @HttpCode(HttpStatus.CREATED)
  async summarize(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitJobDto) {
    const job = await this.aiService.submitJob(user, { ...dto, type: AiJobType.SUMMARIZE });
    return { data: job };
  }

  @Post('draft-report')
  @HttpCode(HttpStatus.CREATED)
  async draftReport(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitJobDto) {
    const job = await this.aiService.submitJob(user, { ...dto, type: AiJobType.DRAFT_REPORT });
    return { data: job };
  }

  @Get('jobs')
  async findMyJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.aiService.findMyJobs(user, options);
    return formatPaginatedResponse(result);
  }

  @Get('jobs/:id')
  async findJobById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const job = await this.aiService.findJobById(user, id);
    return { data: job };
  }

  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(@CurrentUser() user: AuthenticatedUser, @Body() dto: FeedbackDto) {
    const feedback = await this.aiService.submitFeedback(user, dto);
    return { data: feedback };
  }
}
