import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type {
  JoinConversationPayload,
  LeaveConversationPayload,
  MarkReadPayload,
  SendMessageDto,
} from '@repo/shared';
import { WsEvents, SendMessageSchema } from '@repo/shared';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { MessagingEvents } from './messaging.events';
import { MessagingPushService } from './messaging-push.service';
import { WsJwtGuard, WsAuthenticatedUser } from './guards/ws-jwt.guard';
import { WsRateLimiter } from './ws-rate-limiter';

interface AuthenticatedSocket extends Socket {
  data: { user?: WsAuthenticatedUser };
}

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

@WebSocketGateway({
  namespace: '/ws/messaging',
  cors: {
    origin: isProd ? allowedOrigins : true,
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly rateLimiter: WsRateLimiter;

  constructor(
    private readonly wsJwtGuard: WsJwtGuard,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly events: MessagingEvents,
    private readonly pushService: MessagingPushService,
  ) {
    const limit = Number.parseInt(
      process.env.MESSAGING_RATE_LIMIT_PER_MINUTE ?? '30',
      10,
    );
    this.rateLimiter = new WsRateLimiter(Number.isFinite(limit) ? limit : 30);
  }

  afterInit(server: Server): void {
    this.events.setServer(server);
  }

  // ----------------------------------------------------------------
  // CONNECTION
  // ----------------------------------------------------------------
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const user = await this.wsJwtGuard.authenticate(client);
      client.data.user = user;
      await client.join(this.events.userRoom(user.id));

      // Émet le compteur initial
      const { count } = await this.conversationService.getUnreadCount(user.id);
      client.emit(WsEvents.SERVER_UNREAD_COUNT, { count });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unauthorized';
      client.emit(WsEvents.SERVER_ERROR, {
        code: 'UNAUTHORIZED',
        message: msg,
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const user = client.data?.user;
    if (user) this.rateLimiter.clear(user.id);
  }

  // ----------------------------------------------------------------
  // JOIN conversation
  // ----------------------------------------------------------------
  @SubscribeMessage(WsEvents.CLIENT_JOIN_CONVERSATION)
  async onJoin(
    @MessageBody() data: JoinConversationPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);
    const conversationId = this.requireConversationId(data);
    await this.conversationService.assertOwnership(conversationId, user.id);
    await client.join(this.events.conversationRoom(conversationId));
    return { ok: true };
  }

  // ----------------------------------------------------------------
  // LEAVE conversation
  // ----------------------------------------------------------------
  @SubscribeMessage(WsEvents.CLIENT_LEAVE_CONVERSATION)
  async onLeave(
    @MessageBody() data: LeaveConversationPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ ok: true }> {
    const conversationId = this.requireConversationId(data);
    await client.leave(this.events.conversationRoom(conversationId));
    return { ok: true };
  }

  // ----------------------------------------------------------------
  // SEND message
  // ----------------------------------------------------------------
  @SubscribeMessage(WsEvents.CLIENT_SEND_MESSAGE)
  async onSend(
    @MessageBody() raw: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ ok: true; messageId: number }> {
    const user = this.requireUser(client);

    // Rate limit
    if (!this.rateLimiter.allow(user.id)) {
      throw new WsException(
        'Trop de messages envoyés. Réessayez dans une minute.',
      );
    }

    const parsed = SendMessageSchema.safeParse(raw);
    if (!parsed.success) {
      throw new WsException('Payload invalide');
    }
    const dto: SendMessageDto = parsed.data;

    const { message, recipientId } = await this.messageService.send(
      user.id,
      dto,
    );

    this.events.broadcastNewMessage(
      dto.conversationId,
      user.id,
      recipientId,
      message,
    );

    // Met à jour le compteur GLOBAL du destinataire (nombre de conv avec
    // unread) — pastille tab Messages.
    const { count } =
      await this.conversationService.getUnreadCount(recipientId);
    this.events.sendUnreadCount(recipientId, count);

    // Met à jour le compteur PER-CONV du destinataire — pastille sur l'item
    // de conv dans la liste. C'est la source de vérité, le client n'a plus
    // besoin d'incrémenter localement (qui peut diverger).
    const convUnread =
      await this.conversationService.getConversationUnreadCount(
        recipientId,
        dto.conversationId,
      );
    this.events.sendConversationUnread(
      recipientId,
      dto.conversationId,
      convUnread,
    );

    // Notification push si le destinataire ne lit pas activement la conv
    // (on passe le compteur global pour synchroniser le badge OS iOS/Android)
    await this.pushService.notifyIfOffline(
      dto.conversationId,
      recipientId,
      user,
      message,
      count,
    );

    return { ok: true, messageId: message.id };
  }

  // ----------------------------------------------------------------
  // MARK READ
  // ----------------------------------------------------------------
  @SubscribeMessage(WsEvents.CLIENT_MARK_READ)
  async onMarkRead(
    @MessageBody() data: MarkReadPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ ok: true; messageIds: number[] }> {
    const user = this.requireUser(client);
    const conversationId = this.requireConversationId(data);
    const result = await this.messageService.markConversationRead(
      user.id,
      conversationId,
    );

    if (result.messageIds.length > 0) {
      this.events.broadcastMessageRead(
        conversationId,
        user.id,
        result.senderIds,
        result.messageIds,
        result.readAt,
      );
      // Met à jour le compteur GLOBAL du lecteur
      const { count } = await this.conversationService.getUnreadCount(user.id);
      this.events.sendUnreadCount(user.id, count);
      // Met à jour le compteur PER-CONV du lecteur (à 0 après mark-read).
      this.events.sendConversationUnread(user.id, conversationId, 0);
    }
    return { ok: true, messageIds: result.messageIds };
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  private requireUser(client: AuthenticatedSocket): WsAuthenticatedUser {
    const user = client.data?.user;
    if (!user) throw new WsException('Non authentifié');
    return user;
  }

  private requireConversationId(payload: unknown): number {
    const obj = payload as { conversationId?: unknown } | null | undefined;
    const raw = obj?.conversationId;
    let id: number;
    if (typeof raw === 'number') {
      id = raw;
    } else if (typeof raw === 'string') {
      id = Number.parseInt(raw, 10);
    } else {
      id = Number.NaN;
    }
    if (!Number.isInteger(id) || id <= 0) {
      throw new WsException('Identifiant de conversation invalide');
    }
    return id;
  }
}
