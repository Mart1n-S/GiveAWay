import { z } from "zod";

export const DeleteAccountSchema = z
  .object({
    // Pour les comptes email/password
    password: z.string().optional(),

    // Pour les comptes Google
    confirmation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Au moins un des deux doit être fourni
    if (!data.password && !data.confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Une confirmation est requise pour supprimer votre compte",
      });
      return;
    }

    // Si confirmation texte fournie, elle doit être exactement "SUPPRIMER"
    if (data.confirmation !== undefined && data.confirmation !== "SUPPRIMER") {
      ctx.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: 'Veuillez saisir exactement "SUPPRIMER" pour confirmer',
      });
    }
  });

export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;
