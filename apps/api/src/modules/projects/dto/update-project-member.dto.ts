/**
 * Update project member DTO.
 *
 * Used by PATCH /projects/:projectId/members/:userId to change a
 * member's project-scoped role. The service additionally verifies that
 * the last manager/admin is not demoted.
 */
import { IsEnum } from 'class-validator';
import { ProjectRole } from '@constructtrack/types';

export class UpdateProjectMemberDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
