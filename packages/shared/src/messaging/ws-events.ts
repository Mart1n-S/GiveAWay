import type { MessageDto } from "./message.dto";

/**
 * Contrat WebSocket — événements échangés entre le client et le serveur.
 * Le namespace est `/ws/messaging`.
 */
export const WsEvents = {
  // Client -> Server
  CLIENT_JOIN_CONVERSATION: "conversation:join",
  CLIENT_LEAVE_CONVERSATION: "conversation:leave",
  CLIENT_SEND_MESSAGE: "message:send",
  CLIENT_MARK_READ: "message:markRead",

  // Server -> Client
  SERVER_MESSAGE_NEW: "message:new",
  SERVER_MESSAGE_READ: "message:read",
  SERVER_CONVERSATION_UPDATED: "conversation:updated",
  SERVER_CONVERSATION_DELETED: "conversation:deleted",
  SERVER_CONVERSATION_UNREAD: "conversation:unread",
  SERVER_UNREAD_COUNT: "unread:count",
  SERVER_ERROR: "error",
} as const;

export type WsEventName = (typeof WsEvents)[keyof typeof WsEvents];

// ---------------------------------------------------------------------
// Payloads — Server -> Client
// ---------------------------------------------------------------------

export interface MessageNewPayload {
  conversationId: number;
  message: MessageDto;
}

export interface MessageReadPayload {
  conversationId: number;
  messageIds: number[];
  readAt: string;
  readerId: number;
}

export interface ConversationUpdatedPayload {
  conversationId: number;
  lastMessageAt: string;
}

/**
 * Émis quand une conversation est supprimée pour un participant.
 * Raisons possibles : l'autre participant a supprimé son compte / a été
 * supprimé par un admin, le membre de l'asso a quitté l'asso, l'asso a
 * été supprimée. Le client doit retirer la conv de son store et, s'il
 * est actuellement en train de la consulter, retourner à /messages.
 */
export interface ConversationDeletedPayload {
  conversationId: number;
  /** Raison destinée à l'affichage utilisateur (optionnel). */
  reason?: "user_deleted" | "member_left" | "association_deleted";
}

export interface UnreadCountPayload {
  count: number;
}

/**
 * Émis au destinataire d'un nouveau message pour lui pousser la valeur
 * AUTHENTIQUE du compteur de non-lus pour cette conversation. Remplace
 * l'increment local qui peut diverger (réémission, reconnexions, etc.).
 */
export interface ConversationUnreadPayload {
  conversationId: number;
  unreadCount: number;
}

export interface WsErrorPayload {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------
// Payloads — Client -> Server
// ---------------------------------------------------------------------

export interface JoinConversationPayload {
  conversationId: number;
}

export interface LeaveConversationPayload {
  conversationId: number;
}

export interface MarkReadPayload {
  conversationId: number;
}
