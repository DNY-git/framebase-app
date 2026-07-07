/**
 * Token refresh request DTO.
 *
 * The refresh token is verified and rotated in the service. A reused
 * (revoked) refresh token triggers revocation of the entire session family
 * as a theft signal (docs/security/authentication.md → Token Security).
 */
import { IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MaxLength(2048)
  refreshToken!: string;
}
