import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DowntimeReason } from '@constructtrack/types';

export class CreateDowntimeLogDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(DowntimeReason)
  reason!: DowntimeReason;

  @IsString()
  @IsOptional()
  notes?: string;
}
