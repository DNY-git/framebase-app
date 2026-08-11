/**
 * Update member role DTO.
 */
import { IsEnum } from 'class-validator';
import { Role } from '@constructtrack/types';

export class UpdateMemberRoleDto {
  @IsEnum(Role)
  role!: Role;
}