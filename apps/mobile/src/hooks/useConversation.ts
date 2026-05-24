import { useCallback, useEffect, useRef, useState } from "react";
import { WsEvents } from "@repo/shared";
import type { MessageDto } from "@repo/shared";
import { getSocket } from "../lib/socket";
import { MessagingService } from "../services/messaging.service";
import { useMessageStore } from "../stores/message.store";

interface UseConversationResult {
  messages: MessageDto[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const PAGE_SIZE = 30;

// Fallbacks référentiellement stables : évitent que Zustand retourne un nouvel
// objet à chaque rendu quand la conv n'est pas (encore) dans le store, ce qui
// déclencherait une boucle infinie (Maximum update depth exceeded).
const EMPTY_MESSAGES: readonly MessageDto[] = Object.freeze([]);
interface PageState {
  readonly nextCursor: number | null;
  readonly hasMore: boolean;
}
const DEFAULT_PAGE_STATE: PageState = Object.freeze({
  nextCursor: null,
  hasMore: false,
});

/**
 * Gère le cycle de vie d'une conversation ouverte :
 * - Charge la première page de messages
 * - Émet conversation:join + message:markRead
 * - Pagination scroll-up
 * - Envoi via WS (avec optimistic update)
 */
export function useConversation(
  conversationId: number | null,
): UseConversationResult {
  const messages = useMessageStore((s) => {
    if (conversationId === null) return EMPTY_MESSAGES as MessageDto[];
    return s.messagesByConv[conversationId] ?? (EMPTY_MESSAGES as MessageDto[]);
  });
  const pageState = useMessageStore((s) => {
    if (conversationId === null) return DEFAULT_PAGE_STATE;
    return s.pageStateByConv[conversationId] ?? DEFAULT_PAGE_STATE;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef<Set<number>>(new Set());

  // ── Chargement initial + join + mark read ─────────────
  useEffect(() => {
    if (conversationId === null) return;
    const socket = getSocket();
    let cancelled = false;

    // Marque cette conv comme active : empêche le compteur d'incrémenter
    // localement quand un message arrive pendant qu'on est dans la conv.
    useMessageStore.getState().setActiveConversation(conversationId);

    const init = async () => {
      try {
        setError(null);
        if (!initialLoadDone.current.has(conversationId)) {
          setIsLoading(true);
        }
        const page = await MessagingService.getMessages(conversationId, {
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        useMessageStore.getState().setMessagesPage(
          conversationId,
          page.messages,
          { nextCursor: page.nextCursor, hasMore: page.hasMore },
        );
        initialLoadDone.current.add(conversationId);

        // Join WS room
        socket?.emit(WsEvents.CLIENT_JOIN_CONVERSATION, { conversationId });

        // Mark as read : le serveur émettra unread:count actualisé
        await MessagingService.markRead(conversationId);
        useMessageStore.getState().clearUnreadForConv(conversationId);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger la conversation",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
      socket?.emit(WsEvents.CLIENT_LEAVE_CONVERSATION, { conversationId });
      // Déactive la conv active si c'est toujours celle-ci
      const store = useMessageStore.getState();
      if (store.activeConversationId === conversationId) {
        store.setActiveConversation(null);
      }
    };
  }, [conversationId]);

  // ── Pagination scroll-up ──────────────────────────────
  const loadMore = useCallback(async () => {
    if (conversationId === null) return;
    if (isLoadingMore || !pageState.hasMore || pageState.nextCursor === null) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const page = await MessagingService.getMessages(conversationId, {
        before: pageState.nextCursor,
        limit: PAGE_SIZE,
      });
      useMessageStore.getState().prependMessages(
        conversationId,
        page.messages,
        { nextCursor: page.nextCursor, hasMore: page.hasMore },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du chargement",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, isLoadingMore, pageState.hasMore, pageState.nextCursor]);

  // ── Envoi de message via WS ───────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (conversationId === null) return;
      const trimmed = content.trim();
      if (!trimmed) return;
      const socket = getSocket();
      if (!socket) {
        setError("Connexion WebSocket non disponible");
        return;
      }
      // Optimistic update : on n'ajoute PAS de bulle locale prématurément
      // pour éviter les doublons quand message:new revient — la latence est faible.
      return new Promise<void>((resolve, reject) => {
        socket.emit(
          WsEvents.CLIENT_SEND_MESSAGE,
          { conversationId, content: trimmed },
          (
            ack:
              | { ok: true; messageId: number }
              | { error: string }
              | undefined,
          ) => {
            if (!ack || "error" in ack) {
              const msg = ack?.error ?? "Erreur d'envoi";
              setError(msg);
              reject(new Error(msg));
            } else {
              resolve();
            }
          },
        );
      });
    },
    [conversationId],
  );

  return {
    messages,
    hasMore: pageState.hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    sendMessage,
  };
}
