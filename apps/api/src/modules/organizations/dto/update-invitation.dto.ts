import { IsDateString } from 'class-validator';

export class UpdateInvitationDto {
  @IsDateString()
  expiresAt!: string;
}
