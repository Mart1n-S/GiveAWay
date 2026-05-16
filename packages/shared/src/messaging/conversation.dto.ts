import type { MessageDto } from "./message.dto";

/**
 * Aperçu d'une conversation pour la liste (sidebar / écran "Messages").
 * `otherUser` = l'autre participant (bénévole ou membre de l'asso, selon l'utilisateur courant).
 */
export interface ConversationListItemDto {
  id: number;
  association: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
  otherUser: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  // Côté "rôle" de l'utilisateur courant dans la conv
  currentUserSide: "volunteer" | "associationMember";
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationDto {
  id: number;
  associationId: number;
  volunteerId: number;
  associationMemberId: number;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface ConversationDetailDto extends ConversationListItemDto {
  recentMessages: MessageDto[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface UnreadCountDto {
  count: number;
}
