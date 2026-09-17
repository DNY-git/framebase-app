/**
 * Reset-password request DTO.
 *
 * Accepts a reset token (from the emailed link) and a new password.
 */
import { IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter.',
  })
  @Matches(/[a-z]/, {
    message: 'password must contain at least one lowercase letter.',
  })
  @Matches(/\d/, { message: 'password must contain at least one digit.' })
  password!: string;
}
