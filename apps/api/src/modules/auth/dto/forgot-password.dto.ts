/**
 * Forgot-password request DTO.
 *
 * Accepts an email address. The service always returns the same success
 * response regardless of whether the email is registered (no enumeration).
 */
import { IsEmail, MaxLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'email must be a valid email address.',
  })
  email!: string;
}
