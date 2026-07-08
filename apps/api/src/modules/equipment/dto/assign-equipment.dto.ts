import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignEquipmentDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsDateString()
  startDate!: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;
}
