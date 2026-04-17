import { z } from "zod";

export const GoogleLoginSchema = z.object({
  idToken: z.string().min(1, { message: "Le token Google est obligatoire" }),
  isAccessToken: z.boolean().optional().default(false),
});

export type GoogleLoginFormValues = z.input<typeof GoogleLoginSchema>;
export type GoogleLoginDto = z.output<typeof GoogleLoginSchema>;
