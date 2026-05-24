import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';

@Module({
  imports: [MatchingModule],
  controllers: [MissionController],
  providers: [MissionService],
})
export class MissionModule {}
