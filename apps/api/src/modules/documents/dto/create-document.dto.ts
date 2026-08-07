import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  projectId?: string;
}