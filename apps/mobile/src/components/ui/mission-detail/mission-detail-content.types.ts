import { Cause } from "@repo/shared";
import { Skill } from "@repo/shared";

export interface MissionDetailContentProps {
  /** Description complète de la mission */
  description: string;

  /** Causes soutenues par la mission */
  causes: Cause[];

  /** Compétences recherchées */
  skills: Skill[];

  /** Publics visés */
  publicTypes: { id: number; label: string }[];

  /** Conditions de participation (types de bénévoles) */
  volunteerTypes: { id: number; label: string }[];
}
