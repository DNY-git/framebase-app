import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateUsageLogDto {
  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0)
  hoursUsed!: number;

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
