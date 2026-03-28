import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../common/files/files.module';
import { CookieService } from '../auth/shared/cookie.service';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [ProfileController],
  providers: [ProfileService, CookieService],
})
export class ProfileModule {}
