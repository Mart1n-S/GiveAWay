import { z } from "zod";

export const VerifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, { message: "Le code doit contenir exactement 6 chiffres" })
    .regex(/^[0-9]{6}$/, {
      message: "Le code ne doit contenir que des chiffres",
    }),
});

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
