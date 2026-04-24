import { MissionParticipation } from './mission-participation.dto';
import { ActivityType } from '../mission/mission.enums';

export interface ParticipationSummary {
  totalParticipations: number;
  distinctAssociations: number;
  totalHours: number | null;
  mostFrequentType: ActivityType | null;
}

export interface ParticipationByType {
  type: ActivityType;
  label: string;
  count: number;
}

export interface ParticipationByMonth {
  month: string;
  label: string;
  count: number;
}

export interface ParticipationByAssociation {
  associationId: number;
  name: string;
  count: number;
}

export interface ParticipationStatsDto {
  participations: MissionParticipation[];
  summary: ParticipationSummary;
  byType: ParticipationByType[];
  byMonth: ParticipationByMonth[];
  byAssociation: ParticipationByAssociation[];
}
