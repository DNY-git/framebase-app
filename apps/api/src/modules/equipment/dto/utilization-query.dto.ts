import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class UtilizationQueryDto {
  @IsDateString()
  @IsNotEmpty()
  from!: string;

  @IsDateString()
  @IsNotEmpty()
  to!: string;

  /**
   * Optional pagination. The usage-timeline endpoint reads these via
   * `@Query() query` (the whole query object), so they must be declared
   * here or the global `forbidNonWhitelisted` pipe rejects `perPage`.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class UpcomingMaintenanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number; // Default 30 if not provided
}
