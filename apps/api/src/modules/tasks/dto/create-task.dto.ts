import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsMongoId, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '@constructtrack/types';

export class CreateTaskDto {
  @IsMongoId()
  @IsOptional()
  phaseId?: string;

  @IsMongoId()
  @IsOptional()
  parentId?: string;

  @IsMongoId()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsInt()
  @IsOptional()
  order?: number;
}
