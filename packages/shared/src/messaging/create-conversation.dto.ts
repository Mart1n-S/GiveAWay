import { z } from "zod";
import { NO_HTML_TAGS } from "../auth/auth.constants";
import { MESSAGE_MAX_LENGTH } from "./message.dto";

// ---------------------------------------------------------------------
// Schéma — création d'une conversation
// ---------------------------------------------------------------------

// Une conversation est strictement 1-1 entre deux utilisateurs : aucune
// association n'est requise. Seul l'ID du destinataire est nécessaire.
export const CreateConversationSchema = z.object({
  recipientId: z
    .number({ message: "L'identifiant du destinataire est requis" })
    .int("L'identifiant doit être un entier")
    .positive("L'identifiant doit être positif"),
  initialMessage: z
    .string()
    .trim()
    .min(1, { message: "Le message ne peut pas être vide" })
    .max(MESSAGE_MAX_LENGTH, {
      message: `Le message ne peut pas dépasser ${MESSAGE_MAX_LENGTH} caractères`,
    })
    .regex(NO_HTML_TAGS, {
      message: "Le message contient des caractères interdits (< ou >)",
    })
    .optional(),
});

export type CreateConversationDto = z.infer<typeof CreateConversationSchema>;
