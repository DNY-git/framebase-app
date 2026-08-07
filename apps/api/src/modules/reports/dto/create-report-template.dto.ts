import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateReportTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
