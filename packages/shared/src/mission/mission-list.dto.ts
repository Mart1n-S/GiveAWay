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
  type?: ActivityType;
  causeId?: number;
  city?: string;
  search?: string;
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
