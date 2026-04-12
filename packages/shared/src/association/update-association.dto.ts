import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import {
  NO_HTML_TAGS,
  RNA_REGEX,
  SIRET_REGEX,
  PHONE_REGEX,
} from "../auth/auth.constants";
import { preprocessAddress } from "../auth/register.dto";

// Input (Requête API) — mise à jour partielle d'une association
export const UpdateAssociationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Le nom de l'association est trop court (2 caractères minimum)" })
      .max(255, { message: "Le nom de l'association est trop long (255 caractères maximum)" })
      .regex(NO_HTML_TAGS, { message: "Le nom contient des caractères interdits (< ou >)" })
      .optional(),

    rna: z
      .string()
      .trim()
      .refine((v) => !v || RNA_REGEX.test(v), {
        message:
          "Le numéro RNA doit commencer par W suivi de 9 chiffres (ex: W123456789)",
      })
      .optional(),

    siret: z
      .string()
      .trim()
      .refine((v) => !v || SIRET_REGEX.test(v), {
        message: "Le numéro SIRET doit contenir exactement 14 chiffres",
      })
      .optional(),

    object: z
      .string()
      .trim()
      .max(500, { message: "L'objet est trop long (500 caractères maximum)" })
      .regex(NO_HTML_TAGS, {
        message: "L'objet contient des caractères interdits (< ou >)",
      })
      .optional(),

    legalStatus: z
      .string()
      .trim()
      .max(100, {
        message: "Le statut juridique est trop long (100 caractères maximum)",
      })
      .regex(NO_HTML_TAGS, {
        message: "Le statut juridique contient des caractères interdits (< ou >)",
      })
      .optional(),

    phone: z
      .string()
      .trim()
      .refine((v) => !v || PHONE_REGEX.test(v), {
        message:
          "Le numéro de téléphone doit contenir 10 chiffres et commencer par 0 (ex : 0606060606)",
      })
      .optional(),

    website: z
      .string()
      .trim()
      .refine(
        (v) => {
          if (!v) return true;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        { message: "L'URL du site web est invalide" },
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, {
        message: "La description est trop longue (1000 caractères maximum)",
      })
      .regex(NO_HTML_TAGS, {
        message: "La description contient des caractères interdits (< ou >)",
      })
      .optional(),

    logoUrl: z.string().optional(),

    documentUrls: z.array(z.string()).optional(),

    // Adresse du siège de l'association (optionnelle à la mise à jour)
    address: z.preprocess(preprocessAddress, AddressSchema).optional(),
  })
  .superRefine((data, ctx) => {
    // Si les deux identifiants sont explicitement soumis et les deux sont vides,
    // au moins un des deux doit être renseigné.
    if (
      data.rna !== undefined &&
      data.siret !== undefined &&
      !data.rna &&
      !data.siret
    ) {
      const message = "Veuillez renseigner au moins le RNA ou le SIRET";
      ctx.addIssue({ code: "custom", path: ["rna"], message });
      ctx.addIssue({ code: "custom", path: ["siret"], message });
    }
  });

export type UpdateAssociationFormValues = z.input<typeof UpdateAssociationSchema>;
export type UpdateAssociationDto = z.output<typeof UpdateAssociationSchema>;
