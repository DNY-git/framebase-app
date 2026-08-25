import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * PATCH /v1/equipment/:id/usage/:logId — correct a recorded usage entry.
 * All fields optional; only provided fields are updated.
 */
export class UpdateUsageLogDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hoursUsed?: number;

  @IsString()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  operatorId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
