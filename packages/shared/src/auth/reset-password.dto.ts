import { z } from "zod";
import { PASSWORD_REGEX } from "./auth.constants";

// ----------------------------------------------------------------------
// RESET PASSWORD
// ----------------------------------------------------------------------
export const ResetPasswordSchema = z
  .object({
    code: z
      .string()
      .trim()
      .length(6, { message: "Le code doit contenir exactement 6 chiffres" })
      .regex(/^[0-9]{6}$/, {
        message: "Le code ne doit contenir que des chiffres",
      }),
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
