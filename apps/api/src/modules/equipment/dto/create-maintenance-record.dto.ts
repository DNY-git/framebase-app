import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaintenanceType, MaintenanceStatus } from '@constructtrack/types';

export class CreateMaintenanceRecordDto {
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  nextDueAt?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costCents?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
