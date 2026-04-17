import { z } from "zod";

export const ResendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "L'email est obligatoire" })
    .pipe(z.email({ message: "Format d'email invalide" })),
});

export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
