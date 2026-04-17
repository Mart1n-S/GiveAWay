import { AssociationRole } from "../user/user.enums";

// Output (Réponse API) — représente un membre d'une association
export interface AssociationMemberDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string | null;
  role: AssociationRole;
  createdAt: Date | string;
}
