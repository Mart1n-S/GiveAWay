import { z } from "zod";
import { NO_HTML_TAGS } from "../auth/auth.constants";

export const MESSAGE_MAX_LENGTH = 2000;

// ---------------------------------------------------------------------
// Schémas — validation envoi de message
// ---------------------------------------------------------------------

export const SendMessageSchema = z.object({
  conversationId: z
    .number({ message: "L'identifiant de la conversation est requis" })
    .int("L'identifiant doit être un entier")
    .positive("L'identifiant doit être positif"),
  content: z
    .string()
    .trim()
    .min(1, { message: "Le message ne peut pas être vide" })
    .max(MESSAGE_MAX_LENGTH, {
      message: `Le message ne peut pas dépasser ${MESSAGE_MAX_LENGTH} caractères`,
    })
    .regex(NO_HTML_TAGS, {
      message: "Le message contient des caractères interdits (< ou >)",
    }),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;

// ---------------------------------------------------------------------
// DTOs réponse
// ---------------------------------------------------------------------

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface MessagesPageDto {
  messages: MessageDto[];
  nextCursor: number | null;
  hasMore: boolean;
}
