import { z } from "zod";
import {
  PASSWORD_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./auth.constants";

// ----------------------------------------------------------------------
// CHANGE PASSWORD
// ----------------------------------------------------------------------
// Schéma de validation
export const ChangePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, { message: "Le mot de passe est obligatoire" }),

    newPassword: z
      .string()
      .min(1, { message: "Le mot de passe est obligatoire" })
      .min(PASSWORD_MIN_LENGTH, {
        message: `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères`,
      })
      .max(PASSWORD_MAX_LENGTH, {
        message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères`,
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
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  })
  // Sécurité : On vérifie que le nouveau mot de passe est différent de l'ancien
  .refine((data) => data.newPassword !== data.oldPassword, {
    message: "Le nouveau mot de passe doit être différent de l'ancien",
    path: ["newPassword"],
  });
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
