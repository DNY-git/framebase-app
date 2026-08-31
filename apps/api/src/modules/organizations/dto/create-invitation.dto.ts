/**
 * Create invitation DTO.
 *
 * Inviting as OWNER is rejected in the service (only owners may grant
 * ownership, and only via promotion — never by link).
 */
import { IsDateString, IsEmail, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { Role } from '@constructtrack/types';

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

/** Roles that can be granted via invitation (OWNER is excluded). */
export const INVITABLE_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.PROJECT_MANAGER,
  Role.SITE_ENGINEER,
  Role.CREW,
  Role.PROCUREMENT,
  Role.FLEET_MANAGER,
  Role.VIEWER,
];