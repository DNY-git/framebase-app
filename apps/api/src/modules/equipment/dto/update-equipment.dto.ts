import { IsOptional, IsEnum, IsString, IsDateString, IsInt } from 'class-validator';
import { EquipmentStatus, EquipmentCategory } from '@constructtrack/types';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsEnum(EquipmentCategory)
  category?: EquipmentCategory;

  /** Typed as string — see CreateEquipmentDto for why `Date` breaks validation. */
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsInt()
  purchaseCostCents?: number;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}
