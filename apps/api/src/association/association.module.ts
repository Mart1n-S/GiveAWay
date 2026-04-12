import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssociationController } from './association.controller';
import { AssociationService } from './association.service';
import { AssociationMemberGuard } from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';
import { AssociationVerificationService } from '../auth/register/association-verification.service';

@Module({
  imports: [ConfigModule],
  controllers: [AssociationController],
  providers: [
    AssociationService,
    AssociationVerificationService,
    AssociationMemberGuard,
    AssociationRoleGuard,
  ],
})
export class AssociationModule {}
