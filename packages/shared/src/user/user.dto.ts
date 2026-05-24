import { UserStatus } from "./user.enums";
import { Address } from "../address/address.dto";
import { UserAssociation } from "./user-association.dto";
import { Skill } from "../skill/skill.dto";
import { Cause } from "../cause/cause.dto";
import { UserAvailability } from "./user-availability.dto";
import { MissionParticipation } from "./mission-participation.dto";

// Output (Réponse API)
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  hasPassword: boolean;
  age: number | null;
  biography: string | null;
  profilePicture: string | null;
  status: UserStatus;

  emailNotifications: boolean;
  matchNotifications: boolean;
  followsCount: number;

  /**
   * Nombre total de participations (toutes missions non DELETED confondues).
   * Calculé côté backend dans getProfile / updateProfile pour éviter le bug
   * où le front comptait `participations.length` (capé à 5 par l'aperçu).
   */
  participationsCount?: number;

  /**
   * Nombre d'associations distinctes aidées (basé sur toutes les
   * participations, pas seulement les 5 dernières chargées).
   */
  helpedAssociationsCount?: number;

  createdAt: Date | string;
  updatedAt: Date | string;

  address?: Address | null;
  associations?: UserAssociation[];

  skills?: Skill[];
  causes?: Cause[];
  availability?: UserAvailability | null;
  participations?: MissionParticipation[];
}
