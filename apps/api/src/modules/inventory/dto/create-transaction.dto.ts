import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { TransactionType } from '@constructtrack/types';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  materialId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
