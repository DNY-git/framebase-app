/**
 * Create project DTO.
 *
 * Validates edge input per PROJECT_RULES.md §27 ("Validation at the edge").
 * The project code is normalized (trim + uppercase) in the repository/service
 * layer; here we only validate its shape. Budget is an integer in cents.
 *
 * See docs/features/projects.md → Data Model.
 */
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NigeriaState } from '@constructtrack/types';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'code must contain only letters, digits, and hyphens.',
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  phase?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  // endDate >= startDate is enforced in the service (cross-field validation).
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

  @IsEnum(NigeriaState)
  @IsOptional()
  region?: NigeriaState;
}
