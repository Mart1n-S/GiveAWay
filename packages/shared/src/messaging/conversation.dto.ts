import type { MessageDto } from "./message.dto";

/**
 * Aperçu d'une conversation pour la liste (sidebar / écran "Messages").
 * `otherUser` = l'autre participant (la conv est strictement 1-1, indépendante
 * de toute association).
 * `otherUserAssociation` = l'association à laquelle l'AUTRE participant
 * appartient (au moment du listing). `null` si l'autre user n'est membre
 * d'aucune asso. C'est ce qu'on affiche en "via Asso" — donc deux users
 * voient des assos différentes : chacun voit l'asso de SON interlocuteur.
 */
export interface ConversationListItemDto {
  id: number;
  otherUser: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  otherUserAssociation: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
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
  user1Id: number;
  user2Id: number;
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
