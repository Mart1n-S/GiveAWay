import { z } from "zod";

// Input (Requête API) — ajout d'un membre à une association via son email
export const AddMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "L'email est obligatoire" })
    .pipe(z.email({ message: "Format d'email invalide" })),
});

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
