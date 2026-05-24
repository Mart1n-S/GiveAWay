import { z } from "zod";

export const RejectAssociationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, { message: "Une raison d'au moins 10 caractères est requise" })
    .max(2000),
});
export type RejectAssociationDto = z.infer<typeof RejectAssociationSchema>;

export const SuspendAssociationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, { message: "Une raison d'au moins 10 caractères est requise" })
    .max(2000),
});
export type SuspendAssociationDto = z.infer<typeof SuspendAssociationSchema>;

export const RequestDocumentsSchema = z.object({
  types: z
    .array(z.enum(["STATUTS", "RNA_ATTESTATION", "OFFICE_PROOF"]))
    .min(1, { message: "Au moins un type de document est requis" }),
  message: z.string().trim().max(2000).optional(),
});
export type RequestDocumentsDto = z.infer<typeof RequestDocumentsSchema>;

export const CreateAssociationAdminSchema = z.object({
  name: z.string().trim().min(2).max(255),
  ownerUserId: z.coerce.number().int().positive(),
  description: z.string().trim().max(5000).optional(),
  siret: z.string().trim().optional(),
  rna: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  categoryId: z.coerce.number().int().positive().optional(),
  legalStatus: z.string().trim().max(255).optional(),
  object: z.string().trim().max(5000).optional(),
});
export type CreateAssociationAdminDto = z.infer<typeof CreateAssociationAdminSchema>;

export const UpdateAssociationAdminSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  siret: z.string().trim().optional(),
  rna: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  categoryId: z.coerce.number().int().positive().optional(),
  legalStatus: z.string().trim().max(255).optional(),
  object: z.string().trim().max(5000).optional(),
});
export type UpdateAssociationAdminDto = z.infer<typeof UpdateAssociationAdminSchema>;
