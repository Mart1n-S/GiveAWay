import { api } from "../lib/axios";
import type {
  ConversationListItemDto,
  CreateConversationDto,
  MessageDto,
  MessagesPageDto,
  UnreadCountDto,
} from "@repo/shared";

export const MessagingService = {
  /**
   * GET /conversations
   */
  list: async (): Promise<ConversationListItemDto[]> => {
    const res = await api.get<ConversationListItemDto[]>("/conversations");
    return res.data;
  },

  /**
   * GET /conversations/unread-count
   */
  unreadCount: async (): Promise<UnreadCountDto> => {
    const res = await api.get<UnreadCountDto>("/conversations/unread-count");
    return res.data;
  },

  /**
   * POST /conversations
   */
  create: async (
    dto: CreateConversationDto,
  ): Promise<{
    conversation: ConversationListItemDto;
    firstMessage: MessageDto | null;
  }> => {
    const res = await api.post<{
      conversation: ConversationListItemDto;
      firstMessage: MessageDto | null;
    }>("/conversations", dto);
    return res.data;
  },

  /**
   * POST /conversations/with-association/:associationId
   * Démarre une conversation avec le contact principal d'une association.
   */
  createWithAssociation: async (
    associationId: number,
    initialMessage?: string,
  ): Promise<{
    conversation: ConversationListItemDto;
    firstMessage: MessageDto | null;
  }> => {
    const res = await api.post<{
      conversation: ConversationListItemDto;
      firstMessage: MessageDto | null;
    }>(`/conversations/with-association/${associationId}`, {
      initialMessage,
    });
    return res.data;
  },

  /**
   * GET /conversations/:id/messages?before=&limit=
   */
  getMessages: async (
    conversationId: number,
    options: { before?: number; limit?: number } = {},
  ): Promise<MessagesPageDto> => {
    const params = new URLSearchParams();
    if (options.before !== undefined) {
      params.set("before", String(options.before));
    }
    if (options.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    const query = params.toString();
    const url = `/conversations/${conversationId}/messages${
      query ? `?${query}` : ""
    }`;
    const res = await api.get<MessagesPageDto>(url);
    return res.data;
  },

  /**
   * POST /conversations/:id/read
   */
  markRead: async (
    conversationId: number,
  ): Promise<{ messageIds: number[]; readAt: string }> => {
    const res = await api.post<{ messageIds: number[]; readAt: string }>(
      `/conversations/${conversationId}/read`,
    );
    return res.data;
  },
};
