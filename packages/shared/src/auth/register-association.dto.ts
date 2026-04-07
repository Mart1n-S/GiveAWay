import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import {
  PASSWORD_REGEX,
  NO_HTML_TAGS,
  NAME_REGEX,
  RNA_REGEX,
  SIRET_REGEX,
  PHONE_REGEX,
  formatFirstName as FORMAT_FIRST_NAME,
} from "./auth.constants";

export const RegisterAssociationSchema = z
  .object({
    // ------------------------------------------------------------------
    // Champs du compte utilisateur (futur owner de l'association)
    // ------------------------------------------------------------------
    firstName: z
      .string()
      .trim()
      .min(1, { message: "Le prénom est obligatoire" })
      .min(2, { message: "Le prénom est trop court (2 caractères minimum)" })
      .max(50, { message: "Le prénom est trop long (50 caractères maximum)" })
      .regex(NAME_REGEX, {
        message:
          "Le prénom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
      })
      .transform(FORMAT_FIRST_NAME),

    lastName: z
      .string()
      .trim()
      .min(1, { message: "Le nom est obligatoire" })
      .min(2, { message: "Le nom est trop court (2 caractères minimum)" })
      .max(50, { message: "Le nom est trop long (50 caractères maximum)" })
      .regex(NAME_REGEX, {
        message:
          "Le nom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
      })
      .transform((val) => val.toUpperCase()),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, { message: "L'email est obligatoire" })
      .pipe(z.email({ message: "Format d'email invalide" })),

    password: z
      .string()
      .min(1, { message: "Le mot de passe est obligatoire" })
      .min(12, { message: "Le mot de passe doit faire au moins 12 caractères" })
      .max(50, {
        message: "Le mot de passe ne peut pas dépasser 50 caractères",
      })
      .regex(PASSWORD_REGEX, {
        message:
          "Le mot de passe doit contenir au minimum 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial",
      }),

    confirmPassword: z
      .string()
      .min(1, { message: "La confirmation du mot de passe est obligatoire" }),

    acceptTerms: z.preprocess(
      (val) => val === "true" || val === true,
      z.literal(true, {
        message: "Vous devez accepter les conditions générales d'utilisation",
      }),
    ),

    age: z.preprocess(
      (val) => {
        if (typeof val === "number") return String(val);
        return val;
      },
      z
        .string()
        .trim()
        .min(1, { message: "L'âge est obligatoire" })
        .transform((value) => Number(value))
        .refine((value) => !Number.isNaN(value), {
          message: "L'âge doit être un nombre valide",
        })
        .refine((value) => Number.isInteger(value), {
          message: "L'âge doit être un nombre entier",
        })
        .refine((value) => value >= 18, {
          message: "Vous devez avoir au moins 18 ans pour vous inscrire",
        })
        .refine((value) => value <= 100, {
          message: "Veuillez entrer un âge valide inférieur à 100 ans",
        }),
    ),

    // Adresse personnelle du owner (obligatoire)
    userAddress: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, AddressSchema),

    // Biographie optionnelle du owner
    biography: z
      .string()
      .trim()
      .max(1000, {
        message: "La biographie est trop longue (1000 caractères maximum)",
      })
      .regex(NO_HTML_TAGS, {
        message: "La biographie contient des caractères interdits (< ou >)",
      })
      .optional(),

    // URL de la photo de profil du owner (renseignée après upload serveur)
    profilePicture: z.string().optional(),

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
        message:
          "Le nom de l'association est trop long (255 caractères maximum)",
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
    address: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, AddressSchema),

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
        message:
          "Le statut juridique contient des caractères interdits (< ou >)",
      }),

    logoUrl: z.string().optional(),

    documentUrls: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
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
