import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssociationController } from './association.controller';
import { AssociationService } from './association.service';
import { AssociationMissionsController } from './association-missions.controller';
import { AssociationMissionsService } from './association-missions.service';
import { AssociationMemberGuard } from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AssociationController, AssociationMissionsController],
  providers: [
    AssociationService,
    AssociationMissionsService,
    AssociationMemberGuard,
    AssociationRoleGuard,
  ],
})
export class AssociationModule {}
