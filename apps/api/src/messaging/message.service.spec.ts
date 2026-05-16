import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MessageService } from './message.service';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  conversation: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const makeMessage = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  conversationId: 100,
  senderId: 10,
  content: 'hello',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  readAt: null,
  ...overrides,
});

describe('MessageService', () => {
  let service: MessageService;
  let conversationService: {
    assertOwnership: jest.Mock;
    toMessageDto: jest.Mock;
    getRecipientId: jest.Mock;
  };

  beforeEach(async () => {
    conversationService = {
      assertOwnership: jest.fn().mockResolvedValue({
        id: 100,
        volunteerId: 10,
        associationMemberId: 20,
        associationId: 1,
      }),
      toMessageDto: jest.fn((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt ? m.readAt.toISOString() : null,
      })),
      getRecipientId: jest.fn().mockReturnValue(20),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConversationService, useValue: conversationService },
      ],
    }).compile();

    service = module.get(MessageService);
    jest.clearAllMocks();
  });

  // ==============================================================
  // getMessages
  // ==============================================================
  describe('getMessages', () => {
    it('❌ Refuse si pas owner', async () => {
      conversationService.assertOwnership.mockRejectedValueOnce(
        new ForbiddenException(),
      );
      await expect(service.getMessages(99, 100, undefined, 30)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('✅ Retourne tous les messages quand moins que la limite', async () => {
      mockPrisma.message.findMany.mockResolvedValue([
        makeMessage({ id: 3 }),
        makeMessage({ id: 2 }),
        makeMessage({ id: 1 }),
      ]);
      const res = await service.getMessages(10, 100, undefined, 30);
      expect(res.messages).toHaveLength(3);
      expect(res.hasMore).toBe(false);
      expect(res.nextCursor).toBe(null);
    });

    it('✅ Indique hasMore = true et bon nextCursor', async () => {
      const data = Array.from({ length: 31 }, (_, i) =>
        makeMessage({ id: 50 - i }),
      );
      mockPrisma.message.findMany.mockResolvedValue(data);
      const res = await service.getMessages(10, 100, undefined, 30);
      expect(res.messages).toHaveLength(30);
      expect(res.hasMore).toBe(true);
      // nextCursor = id du dernier message renvoyé (50 - 29 = 21)
      expect(res.nextCursor).toBe(21);
    });

    it('✅ Utilise le curseur "before"', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);
      await service.getMessages(10, 100, 42, 30);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 100, id: { lt: 42 } },
        }),
      );
    });

    it('✅ Borne la limite à 100', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);
      await service.getMessages(10, 100, undefined, 9999);
      const args = mockPrisma.message.findMany.mock.calls[0][0];
      expect(args.take).toBe(101); // 100 + 1
    });

    it('✅ Borne la limite minimum à 1', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);
      await service.getMessages(10, 100, undefined, 0);
      const args = mockPrisma.message.findMany.mock.calls[0][0];
      expect(args.take).toBe(2); // 1 + 1
    });
  });

  // ==============================================================
  // send
  // ==============================================================
  describe('send', () => {
    it('✅ Crée le message et met à jour la conversation', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          message: {
            create: jest
              .fn()
              .mockResolvedValue(makeMessage({ id: 555, content: 'hello' })),
          },
          conversation: {
            update: jest.fn(),
          },
        });
      });

      const res = await service.send(10, {
        conversationId: 100,
        content: 'hello',
      });
      expect(res.message.id).toBe(555);
      expect(res.recipientId).toBe(20);
      expect(conversationService.assertOwnership).toHaveBeenCalledWith(100, 10);
    });

    it('✅ Trim le contenu avant insertion', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValue(makeMessage({ id: 1, content: 'trimmed' }));
      mockPrisma.$transaction.mockImplementation(async (cb) =>
        cb({
          message: { create: createMock },
          conversation: { update: jest.fn() },
        }),
      );

      await service.send(10, {
        conversationId: 100,
        content: '   trimmed   ',
      });
      expect(createMock).toHaveBeenCalledWith({
        data: {
          conversationId: 100,
          senderId: 10,
          content: 'trimmed',
        },
      });
    });
  });

  // ==============================================================
  // markConversationRead
  // ==============================================================
  describe('markConversationRead', () => {
    it('✅ Retourne vide si rien à marquer', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);
      const res = await service.markConversationRead(10, 100);
      expect(res.messageIds).toEqual([]);
      expect(res.senderIds).toEqual([]);
      expect(mockPrisma.message.updateMany).not.toHaveBeenCalled();
    });

    it('✅ Marque tous les messages non-lus et retourne senderIds dédupliqués', async () => {
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 1, senderId: 20 },
        { id: 2, senderId: 20 },
        { id: 3, senderId: 30 },
      ]);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });
      const res = await service.markConversationRead(10, 100);
      expect(res.messageIds).toEqual([1, 2, 3]);
      expect(res.senderIds.sort()).toEqual([20, 30]);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
        data: { readAt: expect.any(Date) },
      });
    });

    it('❌ Refuse si pas owner', async () => {
      conversationService.assertOwnership.mockRejectedValueOnce(
        new ForbiddenException(),
      );
      await expect(service.markConversationRead(99, 100)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
