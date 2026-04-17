import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import {
  NO_HTML_TAGS,
  RNA_REGEX,
  SIRET_REGEX,
  PHONE_REGEX,
} from "./auth.constants";
import { BaseUserSchema, preprocessAddress } from "./register.dto";

export const RegisterAssociationSchema = BaseUserSchema.extend({
  // Adresse personnelle du owner (obligatoire)
  userAddress: z.preprocess(preprocessAddress, AddressSchema),

  // ------------------------------------------------------------------
  // Champs de l'association
  // ------------------------------------------------------------------
  name: z
    .string()
    .trim()
    .min(1, { message: "Le nom de l'association est obligatoire" })
    .min(2, {
      message: "Le nom de l'association est trop court (2 caractères minimum)",
    })
    .max(255, {
      message: "Le nom de l'association est trop long (255 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "Le nom contient des caractères interdits (< ou >)",
    }),

  // Les champs optionnels ci-dessous utilisent .refine() plutôt que z.preprocess()
  // pour conserver string | undefined comme type d'entrée (compatible react-hook-form).
  // Une valeur vide ("") est acceptée comme absente via `!v`.

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

  // Adresse du siège de l'association (obligatoire)
  address: z.preprocess(preprocessAddress, AddressSchema),

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

  object: z
    .string()
    .trim()
    .min(1, { message: "L'objet de l'association est obligatoire" })
    .max(500, {
      message: "L'objet est trop long (500 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "L'objet contient des caractères interdits (< ou >)",
    }),

  legalStatus: z
    .string()
    .trim()
    .min(1, { message: "Le statut juridique est obligatoire" })
    .max(100, {
      message: "Le statut juridique est trop long (100 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "Le statut juridique contient des caractères interdits (< ou >)",
    }),

  logoUrl: z.string().optional(),

  documentUrls: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Les mots de passe ne correspondent pas",
    });
  }
  // Au moins un des deux identifiants (RNA ou SIRET) doit être renseigné
  if (!data.rna && !data.siret) {
    const message = "Veuillez renseigner au moins le RNA ou le SIRET";
    ctx.addIssue({ code: "custom", path: ["rna"], message });
    ctx.addIssue({ code: "custom", path: ["siret"], message });
  }
});

export type RegisterAssociationFormValues = z.input<
  typeof RegisterAssociationSchema
>;

export type RegisterAssociationDto = z.output<typeof RegisterAssociationSchema>;
