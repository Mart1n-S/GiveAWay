import { z } from "zod";
import { AddressSchema } from "../address/address.dto";

// ----------------------------------------------------------------------
// CONSTANTES & REGEX
// ----------------------------------------------------------------------

// Regex simple pour éviter les injections HTML basiques (< et >)
const NO_HTML_TAGS = /^[^<>]*$/;

// Regex Mot de passe :
// - Au moins 1 minuscule
// - Au moins 1 majuscule
// - Au moins 1 chiffre
// - Au moins 1 caractère spécial
// Note : La longueur est gérée par .min() et .max() plus bas, donc on retire {12,50} de la regex pour éviter les doublons d'erreurs
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

// ----------------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------------
export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "L'email est obligatoire" })
    .pipe(z.email({ message: "Format d'email invalide" })),

  password: z.string().min(1, { message: "Le mot de passe est obligatoire" }),
});

export type LoginDto = z.infer<typeof LoginSchema>;

// ----------------------------------------------------------------------
// REGISTER
// ----------------------------------------------------------------------
export const RegisterSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, { message: "Le prénom est obligatoire" })
      .min(2, { message: "Le prénom est trop court (2 caractères minimum)" })
      .max(50, { message: "Le prénom est trop long (50 caractères maximum)" })
      .regex(NO_HTML_TAGS, {
        message: "Le prénom contient des caractères interdits (< ou >)",
      }),

    lastName: z
      .string()
      .trim()
      .min(1, { message: "Le nom est obligatoire" })
      .min(2, { message: "Le nom est trop court (2 caractères minimum)" })
      .max(50, { message: "Le nom est trop long (50 caractères maximum)" })
      .regex(NO_HTML_TAGS, {
        message: "Le nom contient des caractères interdits (< ou >)",
      }),

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
          "Le mot de passe doit contenir au minimum 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)",
      }),

    confirmPassword: z
      .string()
      .min(1, { message: "La confirmation du mot de passe est obligatoire" }),

    acceptTerms: z.literal(true, {
      message: "Vous devez accepter les conditions générales d'utilisation",
    }),

    age: z
      .number()
      .int({ message: "L'âge doit être un nombre entier" })
      .min(18, {
        message: "Vous devez avoir au moins 18 ans pour vous inscrire",
      })
      .max(100, { message: "Âge invalide" }),

    biography: z
      .string()
      .trim()
      .max(1000, {
        message: "La biographie est trop longue (1000 caractères max)",
      })
      .regex(NO_HTML_TAGS, {
        message: "La biographie contient des caractères interdits (< ou >)",
      })
      .optional(),

    profilePicture: z.url().optional(),

    // On réutilise notre schéma Address
    address: AddressSchema,
  })
  .superRefine((data, ctx) => {
    // Validation croisée : mot de passe == confirmation
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  });

export type RegisterDto = z.infer<typeof RegisterSchema>;

// ----------------------------------------------------------------------
// FORGOT PASSWORD
// ----------------------------------------------------------------------
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "L'email est obligatoire" })
    .pipe(z.email({ message: "Format d'email invalide" })),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

// ----------------------------------------------------------------------
// RESET PASSWORD
// ----------------------------------------------------------------------
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Le token est invalide ou manquant'),
    password: z
      .string()
      .min(1, { message: "Le mot de passe est obligatoire" })
      .min(12, { message: "Le mot de passe doit faire au moins 12 caractères" })
      .max(50, {
        message: "Le mot de passe ne peut pas dépasser 50 caractères",
      })
      .regex(PASSWORD_REGEX, {
        message:
          "Le mot de passe doit contenir au minimum 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)",
      }),

    confirmPassword: z
      .string()
      .min(1, { message: "La confirmation du mot de passe est obligatoire" }),
  })
  .superRefine((data, ctx) => {
    // Validation croisée : mot de passe == confirmation
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  });

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;