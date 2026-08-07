import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;
}
