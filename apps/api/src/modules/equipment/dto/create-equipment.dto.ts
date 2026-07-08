import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  name!: string;

  @IsString()
  serialNumber!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  purchaseCostCents?: number;
}
