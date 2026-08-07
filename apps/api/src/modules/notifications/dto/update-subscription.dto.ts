import { IsArray, IsIn, ArrayMinSize } from 'class-validator';
import { NotificationChannel } from '@constructtrack/types';

export class UpdateSubscriptionDto {
  @IsArray()
  @IsIn(['in_app', 'email', 'push'], { each: true })
  @ArrayMinSize(1)
  channels!: NotificationChannel[];
}
