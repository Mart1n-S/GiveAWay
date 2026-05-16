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

export interface UnreadCountPayload {
  count: number;
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
