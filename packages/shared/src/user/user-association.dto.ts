import { AssociationRole } from "./user.enums";

export interface UserAssociation {
  associationId: number;
  name: string;
  role: AssociationRole;
}
