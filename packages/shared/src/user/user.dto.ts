import { UserStatus } from "./user.enums";
import { Address } from "../address/address.dto";
import { UserAssociation } from "./user-association.dto";

// Output (Réponse API)
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  biography: string | null;
  profilePicture: string | null;
  status: UserStatus;

  createdAt: Date | string;
  updatedAt: Date | string;

  // On réutilise l'interface définie dans le module address
  address?: Address | null;

  associations?: UserAssociation[];
}
