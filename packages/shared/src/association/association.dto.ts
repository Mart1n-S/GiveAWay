import { Address } from "../address/address.dto";
import { AssociationStatus } from "../user/user.enums";
import { AssociationMemberDto } from "./association-member.dto";

// Output (Réponse API) — représente un document justificatif d'association
export interface AssociationDocumentDto {
  id: number;
  fileUrl: string;
  type: string;
  createdAt: Date | string;
}

// Output (Réponse API) — profil complet d'une association
export interface AssociationDto {
  id: number;
  name: string;
  rna: string | null;
  siret: string | null;
  object: string | null;
  legalStatus: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  status: AssociationStatus;
  requiresManualReview: boolean;
  rejectionReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  address: Address | null;
  members: AssociationMemberDto[];
  documents: AssociationDocumentDto[];
}
