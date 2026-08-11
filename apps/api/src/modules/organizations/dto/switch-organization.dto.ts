/**
 * Switch active organization DTO.
 *
 * The tenantId is never trusted as authorization — the server verifies the
 * caller holds a membership in the target organization before re-issuing
 * tokens (Phase 4 — secure active-organization mechanism).
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchOrganizationDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;
}