import { create } from "zustand";
import type { ConversationListItemDto, MessageDto } from "@repo/shared";

interface MessagesPageState {
  nextCursor: number | null;
  hasMore: boolean;
}

interface MessageState {
  // Sidebar / écran liste
  conversations: ConversationListItemDto[];
  conversationsLoaded: boolean;

  // Messages cache par conversation
  messagesByConv: Record<number, MessageDto[]>;
  pageStateByConv: Record<number, MessagesPageState>;

  // Compteur global non-lus (source de vérité = serveur via unread:count)
  unreadCount: number;

  // ID de la conversation actuellement ouverte à l'écran
  activeConversationId: number | null;

  // ─── Actions ──────────────────────────────────────────────
  setConversations: (conversations: ConversationListItemDto[]) => void;
  upsertConversation: (conv: ConversationListItemDto) => void;
  bumpConversation: (conversationId: number, lastMessage: MessageDto) => void;
  incrementUnreadForConv: (conversationId: number) => void;
  clearUnreadForConv: (conversationId: number) => void;
  setActiveConversation: (id: number | null) => void;

  // Messages
  setMessagesPage: (
    conversationId: number,
    messages: MessageDto[],
    page: MessagesPageState,
  ) => void;
  prependMessages: (
    conversationId: number,
    older: MessageDto[],
    page: MessagesPageState,
  ) => void;
  appendMessage: (conversationId: number, msg: MessageDto) => void;
  replaceOrAppendMessage: (
    conversationId: number,
    msg: MessageDto,
    tempId?: number,
  ) => void;
  markMessagesRead: (
    conversationId: number,
    messageIds: number[],
    readAt: string,
  ) => void;

  // Compteur global
  setUnreadCount: (count: number) => void;

  // Reset (logout)
  reset: () => void;
}

export const useMessageStore = create<MessageState>()((set) => ({
  conversations: [],
  conversationsLoaded: false,
  messagesByConv: {},
  pageStateByConv: {},
  unreadCount: 0,
  activeConversationId: null,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setConversations: (conversations) =>
    set({ conversations, conversationsLoaded: true }),

  upsertConversation: (conv) =>
    set((state) => {
      const others = state.conversations.filter((c) => c.id !== conv.id);
      return {
        conversations: [conv, ...others].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      };
    }),

  bumpConversation: (conversationId, lastMessage) =>
    set((state) => {
      const target = state.conversations.find((c) => c.id === conversationId);
      if (!target) return state;
      const updated: ConversationListItemDto = {
        ...target,
        lastMessage: {
          id: lastMessage.id,
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
        },
        updatedAt: lastMessage.createdAt,
      };
      const others = state.conversations.filter((c) => c.id !== conversationId);
      return { conversations: [updated, ...others] };
    }),

  incrementUnreadForConv: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c,
      ),
    })),

  clearUnreadForConv: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  setMessagesPage: (conversationId, messages, page) =>
    set((state) => ({
      messagesByConv: { ...state.messagesByConv, [conversationId]: messages },
      pageStateByConv: { ...state.pageStateByConv, [conversationId]: page },
    })),

  prependMessages: (conversationId, older, page) =>
    set((state) => {
      const existing = state.messagesByConv[conversationId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const merged = [
        ...existing,
        ...older.filter((m) => !existingIds.has(m.id)),
      ];
      return {
        messagesByConv: { ...state.messagesByConv, [conversationId]: merged },
        pageStateByConv: { ...state.pageStateByConv, [conversationId]: page },
      };
    }),

  appendMessage: (conversationId, msg) =>
    set((state) => {
      const existing = state.messagesByConv[conversationId] ?? [];
      if (existing.some((m) => m.id === msg.id)) {
        return state;
      }
      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: [msg, ...existing],
        },
      };
    }),

  replaceOrAppendMessage: (conversationId, msg, tempId) =>
    set((state) => {
      const existing = state.messagesByConv[conversationId] ?? [];
      const hasReal = existing.some((m) => m.id === msg.id);
      let next: MessageDto[];
      if (tempId !== undefined && existing.some((m) => m.id === tempId)) {
        next = existing.map((m) => (m.id === tempId ? msg : m));
      } else if (hasReal) {
        next = existing.map((m) => (m.id === msg.id ? msg : m));
      } else {
        next = [msg, ...existing];
      }
      return {
        messagesByConv: { ...state.messagesByConv, [conversationId]: next },
      };
    }),

  markMessagesRead: (conversationId, messageIds, readAt) =>
    set((state) => {
      const existing = state.messagesByConv[conversationId];
      if (!existing) return state;
      const idSet = new Set(messageIds);
      const next = existing.map((m) =>
        idSet.has(m.id) ? { ...m, readAt } : m,
      );
      return {
        messagesByConv: { ...state.messagesByConv, [conversationId]: next },
      };
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  reset: () =>
    set({
      conversations: [],
      conversationsLoaded: false,
      messagesByConv: {},
      pageStateByConv: {},
      unreadCount: 0,
      activeConversationId: null,
    }),
}));
