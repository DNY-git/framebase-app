/**
 * Create project member DTO.
 *
 * Adds a user to a project with a project-scoped role. The role may narrow
 * (never widen) the tenant-level role. Role validation is via IsEnum;
 * the service additionally verifies the user exists and the caller may
 * manage project membership.
 */
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProjectRole } from '@constructtrack/types';

export class CreateProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  userId!: string;

  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
