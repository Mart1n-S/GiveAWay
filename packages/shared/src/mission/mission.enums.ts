// ─── Enums (miroir des enums Prisma) ───────────────────────────────
// Les const arrays permettent une validation runtime (Zod z.enum())
// en plus du typage statique.

export const ACTIVITY_TYPES = [
  "MISSION",
  "EVENT",
  "COLLECT",
  "INFO",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MISSION_FREQUENCIES = [
  "ONCE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
] as const;
export type MissionFrequency = (typeof MISSION_FREQUENCIES)[number];

export const MISSION_STATUSES = [
  "ACTIVE",
  "ARCHIVED",
  "DELETED",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

// ─── Interface de base ─────────────────────────────────────────────

/** Champs communs à toutes les représentations d'une mission */
export interface MissionBase {
  id: number;
  title: string;
  description: string;
  type: ActivityType;
}
