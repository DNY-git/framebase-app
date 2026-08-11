/**
 * Accept invitation DTO.
 *
 * Only used when the invited email has no account yet: the invitee must
 * provide a name + password to create their account alongside accepting.
 * Existing users accept with their authentication alone (no DTO body).
 */
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(8, 128)
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter.',
  })
  @Matches(/[a-z]/, {
    message: 'password must contain at least one lowercase letter.',
  })
  @Matches(/\d/, { message: 'password must contain at least one digit.' })
  password?: string;
}