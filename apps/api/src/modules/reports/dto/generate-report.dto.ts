import { IsString, IsOptional, IsObject } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
