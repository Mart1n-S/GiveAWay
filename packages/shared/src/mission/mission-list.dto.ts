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
  /** Filtre par association */
  associationId?: number;
  /** Si true ET utilisateur authentifié, l'API enrichit chaque item d'un matchScore. */
  withMatching?: boolean;
}

/** Détail du score de matching, présent uniquement quand withMatching=true et user authentifié. */
export interface MatchBreakdown {
  causes: number;
  skills: number;
  availability: number;
  distance: number;
  history: number;
}

/** Seuil minimum pour qu'une mission soit considérée comme matchant le profil utilisateur.
 *  Doit rester aligné avec MATCH_THRESHOLD côté backend (apps/api/src/matching/matching.service.ts). */
export const MATCH_THRESHOLD = 40;

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

  /** Score de matching (0-100). Présent uniquement si la requête est authentifiée
   *  ET inclut withMatching=true. */
  matchScore?: number;
  /** Détail du score par axe — mêmes conditions que matchScore. */
  matchBreakdown?: MatchBreakdown;
}

/** Réponse paginée pour le listing des missions */
export interface MissionListResponse {
  missions: MissionListItem[];
  total: number;
  page: number;
  pageSize: number;
}
