/**
 * Login request DTO.
 *
 * Validates only the shape — credential correctness is checked in the
 * service and returns a generic 401 to prevent user enumeration
 * (docs/security/authentication.md → Brute-Force & Enumeration Protection).
 */
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(256)
  password!: string;
}
