import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { FilesModule } from '../common/files/files.module';
import { AdminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { AdminCookieService } from './auth/cookie.service';
import { AdminJwtStrategy } from './auth/jwt.strategy';
import { AdminJwtRefreshStrategy } from './auth/jwt-refresh.strategy';
import { AdminAssociationController } from './association/association.controller';
import { AdminAssociationService } from './association/association.service';
import { AdminUserController } from './user/user.controller';
import { AdminUserService } from './user/user.service';
import { AdminManagementController } from './management/management.controller';
import { AdminManagementService } from './management/management.service';
import { AdminStatsController } from './stats/stats.controller';
import { AdminStatsService } from './stats/stats.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    PrismaModule,
    MailModule,
    FilesModule,
  ],
  controllers: [
    AdminAuthController,
    AdminAssociationController,
    AdminUserController,
    AdminManagementController,
    AdminStatsController,
  ],
  providers: [
    AdminAuthService,
    AdminCookieService,
    AdminJwtStrategy,
    AdminJwtRefreshStrategy,
    AdminAssociationService,
    AdminUserService,
    AdminManagementService,
    AdminStatsService,
  ],
})
export class AdminModule {}
