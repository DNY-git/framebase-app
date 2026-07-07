import { IsString, IsOptional, IsEnum, IsInt, IsMongoId, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '@constructtrack/types';

export class UpdateTaskDto {
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
  @IsOptional()
  title?: string;

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
