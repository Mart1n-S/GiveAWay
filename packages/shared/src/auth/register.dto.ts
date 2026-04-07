import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import {
  PASSWORD_REGEX,
  NO_HTML_TAGS,
  NAME_REGEX,
  formatFirstName as FORMAT_FIRST_NAME,
} from "./auth.constants";

// ----------------------------------------------------------------------
// Helper : prétraitement JSON pour les champs adresse multipart
// ----------------------------------------------------------------------
export const preprocessAddress = (val: unknown) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// ----------------------------------------------------------------------
// Champs utilisateur communs à l'inscription bénévole ET association
// ----------------------------------------------------------------------
export const BaseUserSchema = z.object({
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
      .transform(Number)
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

  profilePicture: z.string().optional(),
});

// ----------------------------------------------------------------------
// REGISTER (bénévole)
// ----------------------------------------------------------------------
export const RegisterSchema = BaseUserSchema.extend({
  address: z.preprocess(preprocessAddress, AddressSchema),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Les mots de passe ne correspondent pas",
    });
  }
});

export type RegisterFormValues = z.input<typeof RegisterSchema>;

export type RegisterDto = z.output<typeof RegisterSchema>;
