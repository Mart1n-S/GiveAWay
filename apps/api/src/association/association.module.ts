import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssociationController } from './association.controller';
import { AssociationService } from './association.service';
import { AssociationMissionsController } from './association-missions.controller';
import { AssociationMissionsService } from './association-missions.service';
import { AssociationFollowController } from './association-follow.controller';
import { AssociationFollowService } from './association-follow.service';
import { AssociationMemberGuard } from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';
import { NotificationModule } from '../notification/notification.module';
import { MatchingModule } from '../matching/matching.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [ConfigModule, NotificationModule, MatchingModule, MessagingModule],
  controllers: [
    AssociationController,
    AssociationMissionsController,
    AssociationFollowController,
  ],
  providers: [
    AssociationService,
    AssociationMissionsService,
    AssociationFollowService,
    AssociationMemberGuard,
    AssociationRoleGuard,
  ],
})
export class AssociationModule {}
