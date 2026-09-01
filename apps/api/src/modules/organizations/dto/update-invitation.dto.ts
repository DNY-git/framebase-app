import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateInvitationDto {
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  usageLimit?: number | null;
}
