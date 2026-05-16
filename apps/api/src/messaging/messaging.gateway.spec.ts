import { WsException } from '@nestjs/websockets';
import { MessagingGateway } from './messaging.gateway';
import { WsEvents } from '@repo/shared';

const baseUser = { id: 10, email: 'a@a', firstName: 'A', lastName: 'B' };

function makeGateway() {
  const wsJwtGuard = {
    authenticate: jest.fn().mockResolvedValue(baseUser),
  } as unknown as import('./guards/ws-jwt.guard').WsJwtGuard;

  const conversationService = {
    assertOwnership: jest.fn().mockResolvedValue({
      id: 1,
      volunteerId: 10,
      associationMemberId: 20,
      associationId: 1,
    }),
    getUnreadCount: jest.fn().mockResolvedValue({ count: 2 }),
  } as unknown as import('./conversation.service').ConversationService;

  const messageService = {
    send: jest.fn().mockResolvedValue({
      message: {
        id: 99,
        conversationId: 1,
        senderId: 10,
        content: 'hi',
        createdAt: '2026-01-01T10:00:00Z',
        readAt: null,
      },
      recipientId: 20,
    }),
    markConversationRead: jest.fn().mockResolvedValue({
      messageIds: [1, 2],
      senderIds: [20],
      readAt: new Date('2026-01-01T11:00:00Z'),
    }),
  } as unknown as import('./message.service').MessageService;

  const events = {
    setServer: jest.fn(),
    broadcastNewMessage: jest.fn(),
    broadcastMessageRead: jest.fn(),
    sendUnreadCount: jest.fn(),
    userRoom: (id: number) => `user:${id}`,
    conversationRoom: (id: number) => `conv:${id}`,
  } as unknown as import('./messaging.events').MessagingEvents;

  const pushService = {
    notifyIfOffline: jest.fn().mockResolvedValue(undefined),
  } as unknown as import('./messaging-push.service').MessagingPushService;

  const gw = new MessagingGateway(
    wsJwtGuard,
    conversationService,
    messageService,
    events,
    pushService,
  );

  return {
    gw,
    wsJwtGuard,
    conversationService,
    messageService,
    events,
    pushService,
  };
}

function makeClient() {
  return {
    data: {} as Record<string, unknown>,
    handshake: { auth: {}, headers: {}, query: {} },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as import('socket.io').Socket & {
    join: jest.Mock;
    leave: jest.Mock;
    emit: jest.Mock;
    disconnect: jest.Mock;
  };
}

describe('MessagingGateway', () => {
  describe('afterInit', () => {
    it('attache le serveur dans MessagingEvents', () => {
      const { gw, events } = makeGateway();
      const fakeServer = {} as import('socket.io').Server;
      gw.afterInit(fakeServer);
      expect(events.setServer).toHaveBeenCalledWith(fakeServer);
    });
  });

  describe('handleConnection', () => {
    it('✅ authentifie + join room user + envoie unread count', async () => {
      const { gw, wsJwtGuard, conversationService } = makeGateway();
      const client = makeClient();
      await gw.handleConnection(client);
      expect(wsJwtGuard.authenticate).toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith('user:10');
      expect(client.emit).toHaveBeenCalledWith(WsEvents.SERVER_UNREAD_COUNT, {
        count: 2,
      });
      expect(conversationService.getUnreadCount).toHaveBeenCalledWith(10);
    });

    it('❌ déconnecte si auth échoue', async () => {
      const { gw, wsJwtGuard } = makeGateway();
      (wsJwtGuard.authenticate as jest.Mock).mockRejectedValueOnce(
        new WsException('bad token'),
      );
      const client = makeClient();
      await gw.handleConnection(client);
      expect(client.emit).toHaveBeenCalledWith(
        WsEvents.SERVER_ERROR,
        expect.objectContaining({ code: 'UNAUTHORIZED' }),
      );
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('onJoin', () => {
    it('✅ vérifie ownership et join la room conv', async () => {
      const { gw, conversationService } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      const res = await gw.onJoin({ conversationId: 1 }, client);
      expect(conversationService.assertOwnership).toHaveBeenCalledWith(1, 10);
      expect(client.join).toHaveBeenCalledWith('conv:1');
      expect(res.ok).toBe(true);
    });

    it('❌ refuse conversationId invalide', async () => {
      const { gw } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      await expect(
        gw.onJoin({ conversationId: 0 } as never, client),
      ).rejects.toBeInstanceOf(WsException);
    });

    it('❌ refuse si non authentifié', async () => {
      const { gw } = makeGateway();
      const client = makeClient();
      await expect(
        gw.onJoin({ conversationId: 1 }, client),
      ).rejects.toBeInstanceOf(WsException);
    });
  });

  describe('onLeave', () => {
    it('✅ leave la room', async () => {
      const { gw } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      await gw.onLeave({ conversationId: 1 }, client);
      expect(client.leave).toHaveBeenCalledWith('conv:1');
    });
  });

  describe('onSend', () => {
    it('✅ envoie le message + broadcast + unread:count destinataire + push', async () => {
      const { gw, messageService, events, pushService, conversationService } =
        makeGateway();
      const client = makeClient();
      client.data.user = baseUser;

      const res = await gw.onSend({ conversationId: 1, content: 'hi' }, client);
      expect(res.ok).toBe(true);
      expect(res.messageId).toBe(99);
      expect(messageService.send).toHaveBeenCalledWith(10, {
        conversationId: 1,
        content: 'hi',
      });
      expect(events.broadcastNewMessage).toHaveBeenCalled();
      // Le serveur doit recalculer et émettre unread:count au destinataire (id=20)
      expect(conversationService.getUnreadCount).toHaveBeenCalledWith(20);
      expect(events.sendUnreadCount).toHaveBeenCalledWith(20, 2);
      expect(pushService.notifyIfOffline).toHaveBeenCalled();
    });

    it('❌ refuse payload invalide (content vide)', async () => {
      const { gw } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      await expect(
        gw.onSend({ conversationId: 1, content: '' }, client),
      ).rejects.toBeInstanceOf(WsException);
    });

    it('❌ refuse payload avec balises HTML', async () => {
      const { gw } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      await expect(
        gw.onSend(
          { conversationId: 1, content: '<script>xss</script>' },
          client,
        ),
      ).rejects.toBeInstanceOf(WsException);
    });

    it('❌ rate-limit au-delà de la limite', async () => {
      process.env.MESSAGING_RATE_LIMIT_PER_MINUTE = '2';
      const { gw } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      await gw.onSend({ conversationId: 1, content: 'a' }, client);
      await gw.onSend({ conversationId: 1, content: 'b' }, client);
      await expect(
        gw.onSend({ conversationId: 1, content: 'c' }, client),
      ).rejects.toBeInstanceOf(WsException);
      delete process.env.MESSAGING_RATE_LIMIT_PER_MINUTE;
    });
  });

  describe('onMarkRead', () => {
    it('✅ marque comme lu + broadcast', async () => {
      const { gw, events, messageService } = makeGateway();
      const client = makeClient();
      client.data.user = baseUser;
      const res = await gw.onMarkRead({ conversationId: 1 }, client);
      expect(res.ok).toBe(true);
      expect(res.messageIds).toEqual([1, 2]);
      expect(messageService.markConversationRead).toHaveBeenCalledWith(10, 1);
      expect(events.broadcastMessageRead).toHaveBeenCalled();
      expect(events.sendUnreadCount).toHaveBeenCalledWith(10, 2);
    });

    it('✅ ne broadcast pas si rien à marquer', async () => {
      const { gw, events, messageService } = makeGateway();
      (messageService.markConversationRead as jest.Mock).mockResolvedValueOnce({
        messageIds: [],
        senderIds: [],
        readAt: new Date(),
      });
      const client = makeClient();
      client.data.user = baseUser;
      await gw.onMarkRead({ conversationId: 1 }, client);
      expect(events.broadcastMessageRead).not.toHaveBeenCalled();
    });
  });
});
