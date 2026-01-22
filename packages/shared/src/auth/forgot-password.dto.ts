import { z } from "zod";

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
