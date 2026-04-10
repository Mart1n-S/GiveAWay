import { Address } from "../address/address.dto";
import { Skill } from "../skill/skill.dto";
import { Cause } from "../cause/cause.dto";

// Types d'activité (miroir du enum Prisma)
export type ActivityType = "MISSION" | "EVENT" | "COLLECT" | "INFO";

// Fréquences de mission
export type MissionFrequency = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";

// Statut de mission
export type MissionStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

/** Résumé d'une mission pour le listing */
export interface MissionListItem {
  id: number;
  title: string;
  description: string;
  type: ActivityType;
  hasRegistration: boolean;
  volunteersNeeded: number | null;
  durationInt: number | null;
  frequency: MissionFrequency | null;
  startDate: Date | string | null;
  endDate: Date | string | null;

  association: {
    id: number;
    name: string;
    logoUrl: string | null;
  };

  address: Address | null;
  causes: Cause[];
  skills: Skill[];
  volunteerTypes: { id: number; label: string }[];
}

/** Réponse paginée pour le listing des missions */
export interface MissionListResponse {
  missions: MissionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Paramètres de requête pour le listing des missions */
export interface MissionListQuery {
  page?: number;
  pageSize?: number;
  type?: ActivityType;
  causeId?: number;
  city?: string;
  search?: string;
}
