import { Module } from '@nestjs/common';
import { MissionReminderService } from './mission-reminder.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [MissionReminderService],
  exports: [MissionReminderService],
})
export class MissionReminderModule {}
