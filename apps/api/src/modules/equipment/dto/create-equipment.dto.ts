import { IsString, IsOptional, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { EquipmentCategory } from '@constructtrack/types';

/**
 * Note: purchaseDate must be typed as `string`, not `Date`.
 * The global ValidationPipe uses `enableImplicitConversion`, which converts
 * an incoming ISO string into a Date instance before validation when the DTO
 * property is declared as `Date` — and `@IsDateString()` then rejects the
 * Date object because it expects a string. Declaring `string` keeps the
 * validated value a string; Mongoose casts it to a Date in the schema.
 */
export class CreateEquipmentDto {
  @IsString()
  name!: string;

  @IsString()
  serialNumber!: string;

  @IsEnum(EquipmentCategory)
  category!: EquipmentCategory;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  purchaseCostCents?: number;
}
