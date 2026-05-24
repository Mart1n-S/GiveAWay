import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../common/files/files.module';
import { CookieService } from '../auth/shared/cookie.service';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [AuthModule, FilesModule, MessagingModule],
  controllers: [ProfileController],
  providers: [ProfileService, CookieService],
})
export class ProfileModule {}
