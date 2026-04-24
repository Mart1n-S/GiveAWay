import { z } from 'zod';
import { ACTIVITY_TYPES } from '../mission/mission.enums';

export const ParticipationStatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(ACTIVITY_TYPES).optional(),
});

export type ParticipationStatsQueryDto = z.infer<typeof ParticipationStatsQuerySchema>;
