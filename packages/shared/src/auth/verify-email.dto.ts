import { z } from "zod";

export const VerifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, { message: "Le code doit contenir exactement 6 caractères" }),
});

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
