import { IsString, IsInt, Min, IsOptional, IsDateString } from 'class-validator';

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsDateString()
  archivedAt?: Date | null;
}
