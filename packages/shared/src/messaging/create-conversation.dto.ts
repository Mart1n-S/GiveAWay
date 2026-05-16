import { z } from "zod";
import { NO_HTML_TAGS } from "../auth/auth.constants";
import { MESSAGE_MAX_LENGTH } from "./message.dto";

// ---------------------------------------------------------------------
// Schéma — création d'une conversation
// ---------------------------------------------------------------------

export const CreateConversationSchema = z.object({
  associationId: z
    .number({ message: "L'identifiant de l'association est requis" })
    .int("L'identifiant doit être un entier")
    .positive("L'identifiant doit être positif"),
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
