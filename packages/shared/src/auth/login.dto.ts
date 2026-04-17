import { z } from "zod";
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
