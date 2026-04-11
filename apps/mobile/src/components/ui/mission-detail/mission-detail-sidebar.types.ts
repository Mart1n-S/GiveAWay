import { MissionFrequency } from "@repo/shared";

export interface MissionDetailSidebarProps {
  /** Informations sur l'association organisatrice */
  association: {
    name: string;
    logoUrl: string | null;
    description: string | null;
    website: string | null;
  };

  /** Ville (ou null si à distance) */
  city: string | null;

  /** Adresse complète */
  street: string | null;

  /** Durée en minutes */
  durationInt: number | null;

  /** Fréquence */
  frequency: MissionFrequency | null;

  /** Date de début */
  startDate: Date | string | null;

  /** Date de fin */
  endDate: Date | string | null;

  /** Nombre de bénévoles inscrits */
  participantsCount: number;

  /** Nombre de bénévoles recherchés */
  volunteersNeeded: number | null;

  /** True si la mission nécessite une inscription */
  hasRegistration: boolean;
}
