import { z } from "zod";

export const StatsRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type StatsRangeDto = z.infer<typeof StatsRangeSchema>;

export const TimeseriesQuerySchema = StatsRangeSchema.extend({
  metric: z.enum([
    "user_signups",
    "association_signups",
    "missions_created",
    "participations",
  ]),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});
export type TimeseriesQueryDto = z.infer<typeof TimeseriesQuerySchema>;

export const BreakdownQuerySchema = StatsRangeSchema.extend({
  dimension: z.enum([
    "mission_type",
    "mission_frequency",
    "user_status",
    "association_status",
    "association_category",
    "top_causes",
    "top_skills",
  ]),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type BreakdownQueryDto = z.infer<typeof BreakdownQuerySchema>;

export const TopQuerySchema = StatsRangeSchema.extend({
  entity: z.enum(["associations_by_volunteers", "missions_by_participants", "recent_users", "recent_associations"]),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type TopQueryDto = z.infer<typeof TopQuerySchema>;

export interface KpiValue {
  value: number;
  delta: number | null;
  deltaPct: number | null;
}

export interface DashboardOverview {
  range: { from: string; to: string };
  activeUsers: KpiValue;
  newSignups: KpiValue;
  validatedAssociations: KpiValue;
  pendingAssociations: KpiValue;
  activeMissions: KpiValue;
  participations: KpiValue;
  associationValidationRate: KpiValue;
}

export interface TimeseriesPoint {
  bucket: string;
  count: number;
}
