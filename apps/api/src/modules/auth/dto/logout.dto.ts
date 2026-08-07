/**
 * Logout request DTO.
 *
 * The refresh token is optional — if provided, the corresponding session
 * is revoked server-side. If omitted (e.g., client lost the token),
 * only an audit record is created.
 */
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}
