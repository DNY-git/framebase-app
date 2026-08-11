/**
 * DTO for updating the current user's profile.
 *
 * Only `name` is editable by the user; email and role are immutable.
 * The avatar is handled by a dedicated multipart endpoint (POST /auth/:id/avatar)
 * because it uploads binary data, not a JSON body.
 */
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^(?!\s*$).+/, { message: 'name must not be empty' })
  name?: string;
}