import { IsArray, ValidateNested, ArrayMinSize, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateSubscriptionDto } from './update-subscription.dto';

class SubscriptionEntryDto extends UpdateSubscriptionDto {
  @IsIn(['task.assigned', 'task.due_soon', 'task.blocked', 'task.overdue',
    'task.unblocked', 'dependency.completed', 'inventory.below_reorder',
    'equipment.maintenance_due', 'report.completed', 'report.failed',
    'project.status_changed'])
  type!: string;
}

export class UpsertSubscriptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SubscriptionEntryDto)
  subscriptions!: SubscriptionEntryDto[];
}
