import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import type { MessageDto } from '@repo/shared';
import { WsEvents } from '@repo/shared';

/**
 * Service-pont qui permet au controller REST de pousser des événements WS
 * sans dépendance circulaire avec le gateway.
 * Le gateway s'enregistre via setServer() à son init.
 */
@Injectable()
export class MessagingEvents {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  // ----------------------------------------------------------------
  // Diffusion d'un nouveau message
  // ----------------------------------------------------------------
  broadcastNewMessage(
    conversationId: number,
    senderId: number,
    recipientId: number,
    message: MessageDto,
  ): void {
    if (!this.server) return;
    const payload = { conversationId, message };
    this.server
      .to(this.userRoom(senderId))
      .to(this.userRoom(recipientId))
      .emit(WsEvents.SERVER_MESSAGE_NEW, payload);

    // Notifie aussi la mise à jour générale (pour la sidebar)
    this.server
      .to(this.userRoom(senderId))
      .to(this.userRoom(recipientId))
      .emit(WsEvents.SERVER_CONVERSATION_UPDATED, {
        conversationId,
        lastMessageAt: message.createdAt,
      });
  }

  // ----------------------------------------------------------------
  // Diffusion d'un accusé de lecture
  // ----------------------------------------------------------------
  broadcastMessageRead(
    conversationId: number,
    readerId: number,
    senderIds: number[],
    messageIds: number[],
    readAt: Date,
  ): void {
    if (!this.server) return;
    const payload = {
      conversationId,
      messageIds,
      readAt: readAt.toISOString(),
      readerId,
    };
    for (const sid of senderIds) {
      this.server
        .to(this.userRoom(sid))
        .emit(WsEvents.SERVER_MESSAGE_READ, payload);
    }
  }

  // ----------------------------------------------------------------
  // Notifie un user qu'une conversation a été supprimée
  // ----------------------------------------------------------------
  broadcastConversationDeleted(
    userId: number,
    conversationId: number,
    reason?: 'user_deleted' | 'member_left' | 'association_deleted',
  ): void {
    if (!this.server) return;
    this.server
      .to(this.userRoom(userId))
      .emit(WsEvents.SERVER_CONVERSATION_DELETED, {
        conversationId,
        ...(reason ? { reason } : {}),
      });
  }

  // ----------------------------------------------------------------
  // Envoi unitaire du compteur non-lus à un user
  // ----------------------------------------------------------------
  sendUnreadCount(userId: number, count: number): void {
    if (!this.server) return;
    this.server
      .to(this.userRoom(userId))
      .emit(WsEvents.SERVER_UNREAD_COUNT, { count });
  }

  // ----------------------------------------------------------------
  // Indique si un destinataire a une socket actuellement dans la conv
  // (utilisé pour skipper la notif push)
  // ----------------------------------------------------------------
  async isUserInConversationRoom(
    conversationId: number,
    userId: number,
  ): Promise<boolean> {
    if (!this.server) return false;
    const room = this.server.sockets.adapter.rooms.get(
      this.conversationRoom(conversationId),
    );
    if (!room) return false;
    for (const sid of room) {
      const s = this.server.sockets.sockets.get(sid);
      const u = s?.data?.user as { id?: number } | undefined;
      if (u?.id === userId) return true;
    }
    return false;
  }

  userRoom(userId: number): string {
    return `user:${userId}`;
  }

  conversationRoom(conversationId: number): string {
    return `conv:${conversationId}`;
  }
}
