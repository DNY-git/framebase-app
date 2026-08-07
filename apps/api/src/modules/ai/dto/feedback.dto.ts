import { IsString, IsOptional, IsIn } from 'class-validator';

export class FeedbackDto {
  @IsString()
  messageId!: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsIn(['up', 'down'])
  rating!: 'up' | 'down';

  @IsOptional()
  @IsString()
  comment?: string;
}
