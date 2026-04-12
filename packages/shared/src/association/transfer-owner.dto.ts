import { z } from "zod";

// Input (Requête API) — transfert de la propriété d'une association
export const TransferOwnerSchema = z.object({
  newOwnerUserId: z
    .number({ message: "L'identifiant du nouvel OWNER doit être un nombre" })
    .int({ message: "L'identifiant du nouvel OWNER doit être un entier" })
    .positive({ message: "L'identifiant du nouvel OWNER doit être positif" }),
});

export type TransferOwnerDto = z.infer<typeof TransferOwnerSchema>;
