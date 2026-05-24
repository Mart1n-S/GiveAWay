import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { MessagingEvents } from './messaging.events';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '../generated/prisma/client';

const mockEvents = {
  broadcastConversationDeleted: jest.fn(),
  sendUnreadCount: jest.fn(),
};

// ----------------------------------------------------------------
// Mocks Prisma
// ----------------------------------------------------------------

const mockPrisma = {
  conversation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  association: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  associationUser: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Conversation telle qu'incluse par les requêtes du service :
// `user1` et `user2` (objets) sont inclus, en plus des scalaires.
const baseConvInclude = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  user1Id: 100,
  user2Id: 200,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  lastMessageAt: null,
  user1DeletedAt: null,
  user2DeletedAt: null,
  user1: {
    id: 100,
    firstName: 'Alice',
    lastName: 'V',
    profilePicture: null,
  },
  user2: {
    id: 200,
    firstName: 'Bob',
    lastName: 'M',
    profilePicture: null,
  },
  ...overrides,
});

// ----------------------------------------------------------------
// Suite
// ----------------------------------------------------------------
describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessagingEvents, useValue: mockEvents },
      ],
    }).compile();
    service = module.get(ConversationService);
    jest.clearAllMocks();
  });

  // ==============================================================
  // assertOwnership
  // ==============================================================
  describe('assertOwnership', () => {
    const fullConv = {
      id: 1,
      user1Id: 100,
      user2Id: 200,
      user1DeletedAt: null,
      user2DeletedAt: null,
    };

    it('✅ Retourne la conv quand le user est user1', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(fullConv);
      const res = await service.assertOwnership(1, 100);
      expect(res.id).toBe(1);
    });

    it('✅ Retourne la conv quand le user est user2', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(fullConv);
      const res = await service.assertOwnership(1, 200);
      expect(res.id).toBe(1);
    });

    it("❌ Lève ForbiddenException si la conv n'existe pas ou n'appartient pas", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      await expect(service.assertOwnership(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ==============================================================
  // getOtherUserId
  // ==============================================================
  describe('getOtherUserId', () => {
    it('✅ Retourne user2 si sender = user1', () => {
      expect(service.getOtherUserId({ user1Id: 100, user2Id: 200 }, 100)).toBe(
        200,
      );
    });
    it('✅ Retourne user1 si sender = user2', () => {
      expect(service.getOtherUserId({ user1Id: 100, user2Id: 200 }, 200)).toBe(
        100,
      );
    });
  });

  // ==============================================================
  // createConversation
  // ==============================================================
  describe('createConversation', () => {
    const setupHappyPath = () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 200,
        status: UserStatus.ACTIVE,
      });
      mockPrisma.$transaction.mockImplementation((cb) =>
        cb({
          conversation: {
            upsert: jest.fn().mockResolvedValue(baseConvInclude()),
            update: jest.fn().mockResolvedValue(undefined),
          },
          message: {
            create: jest.fn().mockResolvedValue({
              id: 9001,
              conversationId: 1,
              senderId: 100,
              content: 'hello',
              createdAt: new Date('2026-01-01T10:01:00Z'),
              readAt: null,
            }),
          },
        }),
      );
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);
    };

    it('❌ Refuse si recipient = requester', async () => {
      await expect(
        service.createConversation(100, { recipientId: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ Refuse si destinataire inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.createConversation(100, { recipientId: 200 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('❌ Refuse si destinataire non ACTIVE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 200,
        status: UserStatus.SUSPENDED,
      });
      await expect(
        service.createConversation(100, { recipientId: 200 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('✅ Crée la conversation et retourne le DTO', async () => {
      setupHappyPath();
      const res = await service.createConversation(100, { recipientId: 200 });
      expect(res.conversation).toBeDefined();
      expect(res.conversation.otherUser.id).toBe(200);
      expect(res.firstMessage).toBeNull();
    });

    it('✅ Crée la conversation avec un message initial', async () => {
      setupHappyPath();
      const res = await service.createConversation(100, {
        recipientId: 200,
        initialMessage: 'hello',
      });
      expect(res.firstMessage).not.toBeNull();
      expect(res.firstMessage?.content).toBe('hello');
    });

    it("✅ Inclut l'asso primaire de l'AUTRE user dans le DTO retourné", async () => {
      setupHappyPath();
      mockPrisma.associationUser.findFirst.mockResolvedValueOnce({
        association: { id: 42, name: 'Asso de Bob', logoUrl: null },
      });
      const res = await service.createConversation(100, { recipientId: 200 });
      expect(res.conversation.otherUserAssociation).toEqual({
        id: 42,
        name: 'Asso de Bob',
        logoUrl: null,
      });
    });
  });

  // ==============================================================
  // listConversations
  // ==============================================================
  describe('listConversations', () => {
    it("✅ Retourne la liste avec l'asso primaire de l'AUTRE user", async () => {
      const lastMessage = {
        id: 50,
        content: 'salut',
        senderId: 200,
        createdAt: new Date('2026-01-02T10:00:00Z'),
      };
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          ...baseConvInclude(),
          lastMessageAt: new Date('2026-01-02T10:00:00Z'),
        },
      ]);
      mockPrisma.message.findFirst.mockResolvedValue(lastMessage);
      mockPrisma.message.count.mockResolvedValue(3);
      // Asso primaire du user 200 (vu par le user 100)
      mockPrisma.associationUser.findFirst.mockResolvedValue({
        association: { id: 42, name: 'Asso de Bob', logoUrl: null },
      });

      const res = await service.listConversations(100);
      expect(res).toHaveLength(1);
      expect(res[0].unreadCount).toBe(3);
      expect(res[0].lastMessage?.content).toBe('salut');
      expect(res[0].otherUser.id).toBe(200);
      expect(res[0].otherUserAssociation).toEqual({
        id: 42,
        name: 'Asso de Bob',
        logoUrl: null,
      });
    });

    it("✅ otherUserAssociation = null si l'autre user n'a pas d'asso", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([baseConvInclude()]);
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);

      const res = await service.listConversations(200);
      expect(res[0].otherUser.id).toBe(100);
      expect(res[0].otherUserAssociation).toBeNull();
    });

    it('✅ Masque la conv soft-deletée sans activité postérieure', async () => {
      const deletedAt = new Date('2026-01-05T10:00:00Z');
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          ...baseConvInclude(),
          user1DeletedAt: deletedAt,
          lastMessageAt: new Date('2026-01-04T10:00:00Z'),
        },
      ]);
      const res = await service.listConversations(100);
      expect(res).toHaveLength(0);
      expect(mockPrisma.message.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.message.count).not.toHaveBeenCalled();
    });

    it('✅ Garde la conv soft-deletée si lastMessageAt > deletedAt et filtre par date', async () => {
      const deletedAt = new Date('2026-01-05T10:00:00Z');
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          ...baseConvInclude(),
          user1DeletedAt: deletedAt,
          lastMessageAt: new Date('2026-01-06T10:00:00Z'),
        },
      ]);
      mockPrisma.message.findFirst.mockResolvedValue({
        id: 99,
        content: 'nouveau',
        senderId: 200,
        createdAt: new Date('2026-01-06T10:00:00Z'),
      });
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);

      const res = await service.listConversations(100);
      expect(res).toHaveLength(1);
      expect(res[0].lastMessage?.content).toBe('nouveau');
      expect(mockPrisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gt: deletedAt },
          }),
        }),
      );
    });
  });

  // ==============================================================
  // getUnreadCount
  // ==============================================================
  describe('getUnreadCount', () => {
    it('✅ Retourne le nombre de conv ayant au moins 1 message non-lu', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: 1,
          user1Id: 100,
          user1DeletedAt: null,
          user2DeletedAt: null,
          lastMessageAt: new Date('2026-01-02T10:00:00Z'),
        },
        {
          id: 2,
          user1Id: 100,
          user1DeletedAt: null,
          user2DeletedAt: null,
          lastMessageAt: new Date('2026-01-03T10:00:00Z'),
        },
      ]);
      mockPrisma.message.count.mockResolvedValue(1);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(2);
    });

    it('✅ Retourne 0 si aucune conv', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(0);
    });

    it('✅ Exclut les conv soft-deletées sans activité postérieure', async () => {
      const deletedAt = new Date('2026-01-05T10:00:00Z');
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: 1,
          user1Id: 100,
          user1DeletedAt: deletedAt,
          user2DeletedAt: null,
          lastMessageAt: new Date('2026-01-04T10:00:00Z'),
        },
      ]);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(0);
      expect(mockPrisma.message.count).not.toHaveBeenCalled();
    });
  });

  // ==============================================================
  // softDeleteForUser
  // ==============================================================
  describe('softDeleteForUser', () => {
    it('✅ Stocke user1DeletedAt si user appelant = user1', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        user1Id: 100,
        user2Id: 200,
        user1DeletedAt: null,
        user2DeletedAt: null,
      });
      mockPrisma.conversation.update.mockResolvedValue(undefined);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      await service.softDeleteForUser(100, 1);

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { user1DeletedAt: expect.any(Date) },
      });
      expect(mockEvents.sendUnreadCount).toHaveBeenCalledWith(100, 0);
    });

    it('✅ Stocke user2DeletedAt si user appelant = user2', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        user1Id: 100,
        user2Id: 200,
        user1DeletedAt: null,
        user2DeletedAt: null,
      });
      mockPrisma.conversation.update.mockResolvedValue(undefined);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      await service.softDeleteForUser(200, 1);

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { user2DeletedAt: expect.any(Date) },
      });
    });

    it("❌ Refuse si l'user n'a pas accès à la conv", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      await expect(service.softDeleteForUser(999, 1)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.conversation.update).not.toHaveBeenCalled();
    });
  });

  // ==============================================================
  // deleteConversationsAndNotify
  // ==============================================================
  describe('deleteConversationsAndNotify', () => {
    it('✅ ne fait rien si aucune conv ne matche', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      const res = await service.deleteConversationsAndNotify({
        where: { user1Id: 100 },
        reason: 'user_deleted',
      });
      expect(res).toEqual({ deletedCount: 0, notifiedUserIds: [] });
      expect(mockEvents.broadcastConversationDeleted).not.toHaveBeenCalled();
      expect(mockPrisma.conversation.deleteMany).not.toHaveBeenCalled();
    });

    it('✅ notifie les deux participants + supprime + resync compteurs', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 1, user1Id: 100, user2Id: 200 },
        { id: 2, user1Id: 100, user2Id: 300 },
      ]);
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.conversation.count.mockResolvedValue(0);

      const res = await service.deleteConversationsAndNotify({
        where: { user1Id: 100 },
        reason: 'user_deleted',
      });

      expect(res.deletedCount).toBe(2);
      expect(res.notifiedUserIds.toSorted((a, b) => a - b)).toEqual([
        100, 200, 300,
      ]);
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalledTimes(4);
      expect(mockEvents.sendUnreadCount).toHaveBeenCalledTimes(3);
      expect(mockPrisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { user1Id: 100 },
      });
    });

    it("✅ excludedUserId : ne notifie pas l'user supprimé", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 1, user1Id: 100, user2Id: 200 },
      ]);
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.conversation.count.mockResolvedValue(0);

      await service.deleteConversationsAndNotify({
        where: { user1Id: 100 },
        reason: 'user_deleted',
        excludedUserId: 100,
      });

      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalledTimes(1);
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalledWith(
        200,
        1,
        'user_deleted',
      );
    });

    it('✅ skipDelete=true : notifie sans supprimer (cascade Prisma)', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 5, user1Id: 100, user2Id: 200 },
      ]);
      mockPrisma.conversation.count.mockResolvedValue(0);

      const res = await service.deleteConversationsAndNotify({
        where: { user1Id: 100 },
        reason: 'user_deleted',
        skipDelete: true,
      });

      expect(res.deletedCount).toBe(0);
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalled();
      expect(mockPrisma.conversation.deleteMany).not.toHaveBeenCalled();
    });

    it('✅ recalcule unread:count en EXCLUANT les conv en cours de suppression', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 42, user1Id: 100, user2Id: 200 },
        { id: 43, user1Id: 100, user2Id: 300 },
      ]);
      mockPrisma.conversation.count.mockResolvedValue(0);

      await service.deleteConversationsAndNotify({
        where: { user1Id: 100 },
        reason: 'user_deleted',
        excludedUserId: 100,
        skipDelete: true,
      });

      const calls = mockPrisma.conversation.count.mock.calls as Array<
        [{ where: { id: { notIn: number[] } } }]
      >;
      expect(calls.length).toBeGreaterThan(0);
      for (const [arg] of calls) {
        expect(arg.where.id).toEqual({ notIn: [42, 43] });
      }
    });
  });

  // ==============================================================
  // toMessageDto
  // ==============================================================
  describe('toMessageDto', () => {
    it('convertit les dates en ISO', () => {
      const dto = service.toMessageDto({
        id: 1,
        conversationId: 2,
        senderId: 3,
        content: 'x',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        readAt: new Date('2026-01-01T11:00:00Z'),
      });
      expect(dto.createdAt).toBe('2026-01-01T10:00:00.000Z');
      expect(dto.readAt).toBe('2026-01-01T11:00:00.000Z');
    });

    it('renvoie readAt null quand non lu', () => {
      const dto = service.toMessageDto({
        id: 1,
        conversationId: 2,
        senderId: 3,
        content: 'x',
        createdAt: new Date(),
        readAt: null,
      });
      expect(dto.readAt).toBeNull();
    });
  });
});
