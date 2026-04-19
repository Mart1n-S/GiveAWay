import { z } from "zod";
import { ACTIVITY_TYPES, ActivityType } from "./mission.enums";

export interface MissionStatsByType {
  type: ActivityType;
  label: string;
  count: number;
  participants: number;
}

export interface MissionStatsByMonth {
  /** Format "YYYY-MM" */
  month: string;
  /** Ex: "Jan 2024" */
  label: string;
  missions: number;
  participants: number;
}

export interface MissionStatsTopItem {
  id: number;
  title: string;
  participantsCount: number;
  type: ActivityType;
}

export interface AssociationMissionStats {
  summary: {
    totalMissions: number;
    activeMissions: number;
    pastMissions: number;
    archivedMissions: number;
    totalParticipants: number;
    averageParticipantsPerMission: number;
  };
  byType: MissionStatsByType[];
  byMonth: MissionStatsByMonth[];
  participationByMonth: MissionStatsByMonth[];
  topMissions: MissionStatsTopItem[];
}

export const StatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  missionType: z.enum(ACTIVITY_TYPES).optional(),
});

export type StatsQueryDto = z.infer<typeof StatsQuerySchema>;
