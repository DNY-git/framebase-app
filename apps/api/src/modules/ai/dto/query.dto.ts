import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';

export class QueryDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsIn(['sync', 'async'])
  mode?: 'sync' | 'async';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
