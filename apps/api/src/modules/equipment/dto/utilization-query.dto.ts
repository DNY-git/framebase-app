import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class UtilizationQueryDto {
  @IsDateString()
  @IsNotEmpty()
  from!: string;

  @IsDateString()
  @IsNotEmpty()
  to!: string;
}

export class UpcomingMaintenanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number; // Default 30 if not provided
}
