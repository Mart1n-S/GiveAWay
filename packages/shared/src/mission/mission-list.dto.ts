import { Address } from "../address/address.dto";
import { Skill } from "../skill/skill.dto";
import { Cause } from "../cause/cause.dto";
import {
  ActivityType,
  MissionBase,
  MissionFrequency,
} from "./mission.enums";

/** Paramètres de requête pour le listing des missions (type INPUT client) */
export interface MissionListQuery {
  page?: number;
  pageSize?: number;
  /** Filtre par type unique (rétro-compatibilité) */
  type?: ActivityType;
  /** Filtre par types multiples */
  types?: ActivityType[];
  /** Filtre par cause unique (rétro-compatibilité) */
  causeId?: number;
  /** Filtre par causes multiples */
  causeIds?: number[];
  skillIds?: number[];
  publicTypeIds?: number[];
  volunteerTypeIds?: number[];
  city?: string;
  search?: string;
  frequency?: MissionFrequency;
  startDateFrom?: string; // ISO date yyyy-mm-dd
  startDateTo?: string;   // ISO date yyyy-mm-dd
  hasAvailableSpots?: boolean;
  /** nearby = ON_SITE + HYBRID, remote = REMOTE uniquement */
  locationMode?: 'nearby' | 'remote';
}

/** Résumé d'une mission pour le listing */
export interface MissionListItem extends MissionBase {
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
