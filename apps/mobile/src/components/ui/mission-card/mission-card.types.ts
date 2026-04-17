import { ActivityType, MissionFrequency } from "@repo/shared";

export interface MissionCardProps {
  /** Titre de la mission */
  title: string;

  /** Description courte */
  description: string;

  /** Type d'activité — détermine la couleur et l'icône */
  type: ActivityType;

  /** Nom de l'association organisatrice */
  associationName: string;

  /** Ville de la mission (ou null si à distance) */
  city: string | null;

  /** Durée en minutes (ex: 120) */
  durationInt: number | null;

  /** Fréquence de la mission */
  frequency: MissionFrequency | null;

  /** Nombre de bénévoles recherchés */
  volunteersNeeded: number | null;

  /** Date de début */
  startDate: Date | string | null;

  /** Labels des causes associées */
  causes: string[];

  /** Labels des types de bénévoles acceptés */
  volunteerTypes: string[];

  /** Callback au clic sur la card */
  onPress?: () => void;

  /** Classes additionnelles */
  className?: string;

  /** Identifiant de test pour Playwright */
  testID?: string;
}
