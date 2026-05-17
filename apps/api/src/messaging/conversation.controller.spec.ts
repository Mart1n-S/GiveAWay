import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { MessagingEvents } from './messaging.events';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

const fakeReq = (id: number) =>
  ({ user: { id } }) as unknown as AuthenticatedRequest;

describe('ConversationController', () => {
  let controller: ConversationController;
  let convSvc: {
    listConversations: jest.Mock;
    getUnreadCount: jest.Mock;
    createConversation: jest.Mock;
    softDeleteForUser: jest.Mock;
  };
  let msgSvc: { getMessages: jest.Mock; markConversationRead: jest.Mock };
  let events: {
    broadcastNewMessage: jest.Mock;
    broadcastMessageRead: jest.Mock;
    sendUnreadCount: jest.Mock;
  };

  beforeEach(async () => {
    convSvc = {
      listConversations: jest.fn(),
      getUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
      createConversation: jest.fn(),
      softDeleteForUser: jest.fn(),
    };
    msgSvc = {
      getMessages: jest.fn(),
      markConversationRead: jest.fn(),
    };
    events = {
      broadcastNewMessage: jest.fn(),
      broadcastMessageRead: jest.fn(),
      sendUnreadCount: jest.fn(),
    };
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        { provide: ConversationService, useValue: convSvc },
        { provide: MessageService, useValue: msgSvc },
        { provide: MessagingEvents, useValue: events },
      ],
    }).compile();
    controller = mod.get(ConversationController);
  });

  describe('list', () => {
    it('appelle service.listConversations avec user.id', async () => {
      convSvc.listConversations.mockResolvedValue([]);
      const res = await controller.list(fakeReq(42));
      expect(convSvc.listConversations).toHaveBeenCalledWith(42);
      expect(res).toEqual([]);
    });
  });

  describe('unreadCount', () => {
    it('appelle service.getUnreadCount', async () => {
      convSvc.getUnreadCount.mockResolvedValue({ count: 3 });
      const res = await controller.unreadCount(fakeReq(42));
      expect(convSvc.getUnreadCount).toHaveBeenCalledWith(42);
      expect(res.count).toBe(3);
    });
  });

  describe('create', () => {
    const baseConvResponse = {
      id: 1,
      otherUser: {
        id: 99,
        firstName: 'X',
        lastName: 'Y',
        profilePicture: null,
      },
      otherUserAssociation: { id: 10, name: 'A', logoUrl: null },
      lastMessage: null,
      unreadCount: 0,
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    };

    it('✅ crée la conversation et broadcast si message initial', async () => {
      convSvc.createConversation.mockResolvedValue({
        conversation: baseConvResponse,
        firstMessage: {
          id: 100,
          conversationId: 1,
          senderId: 42,
          content: 'hello',
          createdAt: '2026-01-01T10:00:00Z',
          readAt: null,
        },
      });
      await controller.create(fakeReq(42), {
        recipientId: 99,
        initialMessage: 'hello',
      });
      expect(events.broadcastNewMessage).toHaveBeenCalledWith(
        1,
        42,
        99,
        expect.objectContaining({ id: 100, content: 'hello' }),
      );
    });

    it('✅ ne broadcast pas sans message initial', async () => {
      convSvc.createConversation.mockResolvedValue({
        conversation: baseConvResponse,
        firstMessage: null,
      });
      await controller.create(fakeReq(42), { recipientId: 99 });
      expect(events.broadcastNewMessage).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('parse before et limit', async () => {
      msgSvc.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });
      await controller.getMessages(fakeReq(42), 1, '50', '20');
      expect(msgSvc.getMessages).toHaveBeenCalledWith(42, 1, 50, 20);
    });

    it('défaut limit = 30 si non fourni', async () => {
      msgSvc.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });
      await controller.getMessages(fakeReq(42), 1);
      expect(msgSvc.getMessages).toHaveBeenCalledWith(42, 1, undefined, 30);
    });
  });

  describe('markRead', () => {
    it('✅ broadcast message:read + envoie unread:count au lecteur', async () => {
      msgSvc.markConversationRead.mockResolvedValue({
        messageIds: [10, 20],
        senderIds: [99],
        readAt: new Date('2026-01-01T11:00:00Z'),
      });
      convSvc.getUnreadCount.mockResolvedValue({ count: 2 });
      const res = await controller.markRead(fakeReq(42), 1);
      expect(events.broadcastMessageRead).toHaveBeenCalledWith(
        1,
        42,
        [99],
        [10, 20],
        expect.any(Date),
      );
      // Le compteur global du lecteur (42) doit être recalculé et émis
      expect(convSvc.getUnreadCount).toHaveBeenCalledWith(42);
      expect(events.sendUnreadCount).toHaveBeenCalledWith(42, 2);
      expect(res.messageIds).toEqual([10, 20]);
      expect(res.readAt).toBe('2026-01-01T11:00:00.000Z');
    });

    it('✅ ne broadcast pas message:read si rien à marquer mais synchronise quand même unread:count', async () => {
      msgSvc.markConversationRead.mockResolvedValue({
        messageIds: [],
        senderIds: [],
        readAt: new Date(),
      });
      convSvc.getUnreadCount.mockResolvedValue({ count: 0 });
      await controller.markRead(fakeReq(42), 1);
      expect(events.broadcastMessageRead).not.toHaveBeenCalled();
      // Synchronise toujours le compteur côté lecteur — utile si le client
      // a une pastille obsolète alors que la BDD est déjà à 0.
      expect(events.sendUnreadCount).toHaveBeenCalledWith(42, 0);
    });
  });

  describe('softDelete', () => {
    it('✅ délègue au service avec user.id et conversationId', async () => {
      convSvc.softDeleteForUser.mockResolvedValue(undefined);
      const res = await controller.softDelete(fakeReq(42), 7);
      expect(convSvc.softDeleteForUser).toHaveBeenCalledWith(42, 7);
      expect(res).toBeUndefined();
    });
  });
});
