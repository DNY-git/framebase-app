/**
 * Update project DTO.
 *
 * All fields optional — partial update via PATCH. Status is validated with
 * IsEnum; allowed transitions are additionally enforced in the service layer
 * via a transition map (a project can't go completed → active, etc.).
 *
 * See docs/features/projects.md → Lifecycle & States.
 */
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStatus } from '@constructtrack/types';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  phase?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  @IsOptional()
  budgetCents?: number;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  @IsString()
  @IsOptional()
  managerId?: string;
}
