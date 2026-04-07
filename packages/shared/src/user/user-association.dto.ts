import { AssociationRole } from "./user.enums";

export interface UserAssociation {
  associationId: number;
  name: string;
  role: AssociationRole;
  // Champs optionnels d'association (peuvent être exposés selon le contexte API)
  rna?: string | null;
  siret?: string | null;
  legalStatus?: string | null;
  object?: string | null;
  logoUrl?: string | null;
}
