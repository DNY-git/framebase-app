import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateDeliveryDto {
  @IsString()
  supplier!: string;

  @IsString()
  materialId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
