import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { NotificationType } from '@constructtrack/types';

const VALID_TYPES: NotificationType[] = [
  'task.assigned', 'task.due_soon', 'task.blocked', 'task.overdue',
  'task.unblocked', 'dependency.completed', 'inventory.below_reorder',
  'equipment.maintenance_due', 'report.completed', 'report.failed',
  'project.status_changed',
];

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsIn(VALID_TYPES)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  link?: string;
}
