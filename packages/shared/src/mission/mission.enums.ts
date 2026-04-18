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

/** Statuts visibles dans le tableau de bord association (exclut DELETED) */
export const MANAGED_MISSION_STATUSES = [
  "ACTIVE",
  "ARCHIVED",
] as const;
export type ManagedMissionStatus = (typeof MANAGED_MISSION_STATUSES)[number];

/** Onglets du tableau de bord association */
export const MISSION_DASHBOARD_TABS = [
  "active",
  "upcoming",
  "past",
  "archived",
] as const;
export type MissionDashboardTab = (typeof MISSION_DASHBOARD_TABS)[number];

export const MISSION_AVAILABILITY_TYPES = [
  "REMOTE",
  "ON_SITE",
  "HYBRID",
] as const;
export type MissionAvailabilityType = (typeof MISSION_AVAILABILITY_TYPES)[number];
// ─── Interface de base ─────────────────────────────────────────────

/** Champs communs à toutes les représentations d'une mission */
export interface MissionBase {
  id: number;
  title: string;
  description: string;
  type: ActivityType;
  /** null autorisé pour les missions de type INFO (simple information) */
  availabilityType: MissionAvailabilityType | null;
}
