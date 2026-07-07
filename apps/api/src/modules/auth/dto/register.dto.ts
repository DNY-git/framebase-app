/**
 * Registration request DTO.
 *
 * Validates edge input per PROJECT_RULES.md §27 ("Validation at the edge").
 * Password strength is also re-checked in the service (defense-in-depth).
 * See docs/api/authentication.md → Registration.
 */
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'email must be a valid email address.',
  })
  email!: string;

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

  @IsString()
  @Length(1, 200)
  name!: string;
}
