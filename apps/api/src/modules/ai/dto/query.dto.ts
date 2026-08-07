import { IsString, IsOptional, IsIn } from 'class-validator';

export class QueryDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsIn(['sync', 'async'])
  mode?: 'sync' | 'async';
}
