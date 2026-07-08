import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DowntimeReason } from '@constructtrack/types';

export class UpdateDowntimeLogDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(DowntimeReason)
  @IsOptional()
  reason?: DowntimeReason;

  @IsString()
  @IsOptional()
  notes?: string;
}
