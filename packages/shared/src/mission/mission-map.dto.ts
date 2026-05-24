import type { MatchBreakdown } from "./mission-list.dto";
import { MissionBase } from "./mission.enums";

/**
 * Représentation légère d'une mission pour l'affichage sur la carte.
 * Uniquement les missions ayant une adresse géolocalisée (lat/lng non-null).
 */
export interface MissionMapItem extends MissionBase {
  latitude: number;
  longitude: number;
  city: string | null;

  association: {
    name: string;
    logoUrl: string | null;
  };

  /** Score de matching (0-100). Présent uniquement si la requête est authentifiée
   *  ET inclut withMatching=true. */
  matchScore?: number;
  /** Détail du score par axe — mêmes conditions que matchScore. */
  matchBreakdown?: MatchBreakdown;
}
