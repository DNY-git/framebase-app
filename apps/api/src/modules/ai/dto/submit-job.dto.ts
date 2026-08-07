import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { AiJobType } from '@constructtrack/types';

export class SubmitJobDto {
  @IsIn([AiJobType.SUMMARIZE, AiJobType.DRAFT_REPORT])
  type!: AiJobType;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
