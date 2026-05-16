import { useEffect, useRef } from "react";
import { router } from "expo-router";
import type { Socket } from "socket.io-client";
import {
  WsEvents,
  type ConversationDeletedPayload,
  type MessageNewPayload,
  type MessageReadPayload,
  type UnreadCountPayload,
} from "@repo/shared";
import { useAuthStore } from "../stores/auth.store";
import { useMessageStore } from "../stores/message.store";
import { getSocket, disconnectSocket } from "../lib/socket";
import { MessagingService } from "../services/messaging.service";

/**
 * Connecte la socket WS dès que l'utilisateur est authentifié,
 * branche les listeners globaux (messages temps réel, lecture,
 * compteur non-lus) et la débranche au logout.
 *
 * À monter UNE FOIS, idéalement dans le _layout.tsx racine de l'app
 * authentifiée (par ex. (main)/_layout.tsx).
 */
export function useMessagingSocket(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Sur web l'accessToken n'est pas dans le store (cookies httpOnly),
    // on se base donc uniquement sur isAuthenticated.
    if (!isAuthenticated) {
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    // ── unread:count (compteur global) ─────────────────────
    const onUnread = (payload: UnreadCountPayload) => {
      useMessageStore.getState().setUnreadCount(payload.count);
    };

    // ── message:new ─────────────────────────────────────────
    const onNewMessage = (payload: MessageNewPayload) => {
      const store = useMessageStore.getState();
      const knownConv = store.conversations.find(
        (c) => c.id === payload.conversationId,
      );

      store.appendMessage(payload.conversationId, payload.message);

      // Si la conv est déjà dans le store local, on la fait remonter.
      // Sinon (cas d'une nouvelle conv créée par l'autre partie), on refetch
      // la liste pour la voir apparaître avec son unreadCount serveur à jour.
      if (knownConv) {
        store.bumpConversation(payload.conversationId, payload.message);
      } else {
        void MessagingService.list()
          .then((list) => useMessageStore.getState().setConversations(list))
          .catch(() => {
            /* silencieux : la prochaine ouverture de /messages refera fetch */
          });
      }

      // Si c'est mon propre message : rien d'autre à faire
      if (payload.message.senderId === currentUserId) return;

      // Si je suis actuellement dans la conv concernée : auto-mark-read
      // (le serveur recalculera le compteur et l'émettra via unread:count).
      if (store.activeConversationId === payload.conversationId) {
        socket.emit(WsEvents.CLIENT_MARK_READ, {
          conversationId: payload.conversationId,
        });
        return;
      }

      // Si la conv était connue : +1 sur sa pastille locale.
      // Si elle ne l'était pas, le refetch ci-dessus ramènera l'unreadCount serveur.
      if (knownConv) {
        store.incrementUnreadForConv(payload.conversationId);
      }
    };

    // ── message:read ────────────────────────────────────────
    const onMessageRead = (payload: MessageReadPayload) => {
      useMessageStore
        .getState()
        .markMessagesRead(
          payload.conversationId,
          payload.messageIds,
          payload.readAt,
        );
    };

    // ── conversation:deleted ────────────────────────────────
    // L'autre participant a supprimé son compte / quitté l'asso / l'asso
    // a été supprimée. On retire la conv du store. Si l'utilisateur est
    // en train de la lire, on le rapatrie sur la liste des messages.
    const onConversationDeleted = (payload: ConversationDeletedPayload) => {
      const store = useMessageStore.getState();
      const wasActive = store.activeConversationId === payload.conversationId;
      store.removeConversation(payload.conversationId);
      if (wasActive) {
        // Redirige vers la liste avec un flag pour afficher un toast/banner
        router.replace({
          pathname: "/messages",
          params: { closed: String(payload.conversationId) },
        });
      }
    };

    // ── error ───────────────────────────────────────────────
    const onError = (payload: { code: string; message: string }) => {
      // Erreur d'auth → laisser axios refresh le token, puis reconnecter
      if (payload.code === "UNAUTHORIZED") {
        disconnectSocket();
      }
    };

    socket.on(WsEvents.SERVER_UNREAD_COUNT, onUnread);
    socket.on(WsEvents.SERVER_MESSAGE_NEW, onNewMessage);
    socket.on(WsEvents.SERVER_MESSAGE_READ, onMessageRead);
    socket.on(WsEvents.SERVER_CONVERSATION_DELETED, onConversationDeleted);
    socket.on(WsEvents.SERVER_ERROR, onError);

    return () => {
      socket.off(WsEvents.SERVER_UNREAD_COUNT, onUnread);
      socket.off(WsEvents.SERVER_MESSAGE_NEW, onNewMessage);
      socket.off(WsEvents.SERVER_MESSAGE_READ, onMessageRead);
      socket.off(
        WsEvents.SERVER_CONVERSATION_DELETED,
        onConversationDeleted,
      );
      socket.off(WsEvents.SERVER_ERROR, onError);
    };
  }, [isAuthenticated, accessToken, currentUserId]);
}
