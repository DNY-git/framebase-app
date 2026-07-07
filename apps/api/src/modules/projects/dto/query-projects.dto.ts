/**
 * Query projects DTO — validates list endpoint query params.
 *
 * Supports the standard pagination + filtering conventions from
 * docs/api/standards.md → Pagination, Filtering, Sorting. Status is
 * IsEnum-validated so unknown values are rejected at the edge.
 *
 * All fields are optional; defaults are applied in the service.
 */
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ProjectStatus } from '@constructtrack/types';

export class QueryProjectsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  @Matches(/^-?[a-zA-Z]+(,-?[a-zA-Z]+)*$/, {
    message: 'sort must be a comma-separated list of fields with optional - prefix.',
  })
  sort?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
