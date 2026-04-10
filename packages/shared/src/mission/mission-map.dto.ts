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
}
