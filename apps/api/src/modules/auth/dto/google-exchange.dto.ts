/**
 * GoogleExchangeDto — one-time code returned by the OAuth callback redirect.
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleExchangeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}