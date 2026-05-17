import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { MessagingEvents } from './messaging.events';
import { PrismaService } from '../prisma/prisma.service';
import { AssociationStatus, UserStatus } from '../generated/prisma/client';

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
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const baseConvInclude = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  volunteerId: 100,
  associationMemberId: 200,
  associationId: 42,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  lastMessageAt: null,
  volunteerDeletedAt: null,
  associationMemberDeletedAt: null,
  association: { id: 42, name: 'Asso E2E', logoUrl: null },
  volunteer: {
    id: 100,
    firstName: 'Alice',
    lastName: 'V',
    profilePicture: null,
  },
  associationMember: {
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
      volunteerId: 100,
      associationMemberId: 200,
      associationId: 42,
      volunteerDeletedAt: null,
      associationMemberDeletedAt: null,
    };

    it('✅ Retourne la conv quand le user est volunteer', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(fullConv);
      const res = await service.assertOwnership(1, 100);
      expect(res.id).toBe(1);
    });

    it('✅ Retourne la conv quand le user est associationMember', async () => {
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
  // getRecipientId
  // ==============================================================
  describe('getRecipientId', () => {
    it('✅ Retourne associationMember si sender = volunteer', () => {
      expect(
        service.getRecipientId(
          { volunteerId: 100, associationMemberId: 200 },
          100,
        ),
      ).toBe(200);
    });
    it('✅ Retourne volunteer si sender = associationMember', () => {
      expect(
        service.getRecipientId(
          { volunteerId: 100, associationMemberId: 200 },
          200,
        ),
      ).toBe(100);
    });
  });

  // ==============================================================
  // createConversation
  // ==============================================================
  describe('createConversation', () => {
    const setupHappyPath = ({
      requesterIsMember,
    }: {
      requesterIsMember: boolean;
    }) => {
      mockPrisma.association.findUnique.mockResolvedValue({
        id: 42,
        status: AssociationStatus.VALIDATED,
        name: 'Asso',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 200,
        status: UserStatus.ACTIVE,
      });
      mockPrisma.associationUser.findMany.mockResolvedValue(
        requesterIsMember ? [{ userId: 100 }] : [{ userId: 200 }],
      );
      mockPrisma.$transaction.mockImplementation(async (cb) =>
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
    };

    it('❌ Refuse si recipient = requester', async () => {
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ Refuse si association introuvable', async () => {
      mockPrisma.association.findUnique.mockResolvedValue(null);
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 200,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('❌ Refuse si association non VALIDATED', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        id: 42,
        status: AssociationStatus.PENDING,
        name: 'Asso',
      });
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 200,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('❌ Refuse si destinataire inexistant', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        id: 42,
        status: AssociationStatus.VALIDATED,
        name: 'Asso',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 200,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('❌ Refuse si destinataire non ACTIVE', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        id: 42,
        status: AssociationStatus.VALIDATED,
        name: 'Asso',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 200,
        status: UserStatus.SUSPENDED,
      });
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 200,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('❌ Refuse si les deux sont membres (bénévole ↔ bénévole ou membre ↔ membre interdit)', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        id: 42,
        status: AssociationStatus.VALIDATED,
        name: 'Asso',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 200,
        status: UserStatus.ACTIVE,
      });
      mockPrisma.associationUser.findMany.mockResolvedValue([
        { userId: 100 },
        { userId: 200 },
      ]);
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 200,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("❌ Refuse si aucun des deux n'est membre", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        id: 42,
        status: AssociationStatus.VALIDATED,
        name: 'Asso',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 200,
        status: UserStatus.ACTIVE,
      });
      mockPrisma.associationUser.findMany.mockResolvedValue([]);
      await expect(
        service.createConversation(100, {
          associationId: 42,
          recipientId: 200,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('✅ Crée la conversation quand le requester est membre, recipient = bénévole', async () => {
      setupHappyPath({ requesterIsMember: true });
      const res = await service.createConversation(100, {
        associationId: 42,
        recipientId: 200,
      });
      // Quand requester=100 est membre asso : volunteerId = 200 (recipient), associationMemberId = 100 (requester)
      // mais le mock retourne toujours baseConvInclude() avec volunteer=100, member=200
      // (le test vérifie surtout que ça passe sans erreur)
      expect(res.conversation).toBeDefined();
      expect(res.firstMessage).toBeNull();
    });

    it('✅ Crée la conversation avec un message initial', async () => {
      setupHappyPath({ requesterIsMember: false });
      const res = await service.createConversation(100, {
        associationId: 42,
        recipientId: 200,
        initialMessage: 'hello',
      });
      expect(res.firstMessage).not.toBeNull();
      expect(res.firstMessage?.content).toBe('hello');
    });
  });

  // ==============================================================
  // listConversations
  // ==============================================================
  describe('listConversations', () => {
    it('✅ Retourne la liste mappée avec unreadCount', async () => {
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
      // Le service interroge ensuite findFirst + count par conv visible pour
      // appliquer le filtre soft-delete (impossible à exprimer en pur Prisma).
      mockPrisma.message.findFirst.mockResolvedValue(lastMessage);
      mockPrisma.message.count.mockResolvedValue(3);

      const res = await service.listConversations(100);
      expect(res).toHaveLength(1);
      expect(res[0].unreadCount).toBe(3);
      expect(res[0].lastMessage?.content).toBe('salut');
      expect(res[0].currentUserSide).toBe('volunteer');
      expect(res[0].otherUser.id).toBe(200);
    });

    it('✅ currentUserSide = associationMember si user est côté asso', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([baseConvInclude()]);
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockPrisma.message.count.mockResolvedValue(0);
      const res = await service.listConversations(200);
      expect(res[0].currentUserSide).toBe('associationMember');
      expect(res[0].otherUser.id).toBe(100);
    });

    it("✅ Masque la conv soft-deletée sans activité postérieure", async () => {
      const deletedAt = new Date('2026-01-05T10:00:00Z');
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          ...baseConvInclude(),
          volunteerDeletedAt: deletedAt,
          lastMessageAt: new Date('2026-01-04T10:00:00Z'),
        },
      ]);
      const res = await service.listConversations(100);
      expect(res).toHaveLength(0);
      // Pas d'enrichissement déclenché si pas de conv visible
      expect(mockPrisma.message.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.message.count).not.toHaveBeenCalled();
    });

    it("✅ Garde la conv soft-deletée si lastMessageAt > deletedAt", async () => {
      const deletedAt = new Date('2026-01-05T10:00:00Z');
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          ...baseConvInclude(),
          volunteerDeletedAt: deletedAt,
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
      const res = await service.listConversations(100);
      expect(res).toHaveLength(1);
      expect(res[0].lastMessage?.content).toBe('nouveau');
      // Le filtre `createdAt > deletedAt` est bien transmis à Prisma
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
    it('✅ Retourne le compteur', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: 1,
          volunteerId: 100,
          volunteerDeletedAt: null,
          associationMemberDeletedAt: null,
          lastMessageAt: new Date('2026-01-02T10:00:00Z'),
        },
        {
          id: 2,
          volunteerId: 100,
          volunteerDeletedAt: null,
          associationMemberDeletedAt: null,
          lastMessageAt: new Date('2026-01-03T10:00:00Z'),
        },
      ]);
      mockPrisma.message.count.mockResolvedValue(1);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(2);
    });

    it('✅ Retourne 0 si aucune conv non-lue', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(0);
    });

    it("✅ Exclut les conv soft-deletées sans activité postérieure", async () => {
      const deletedAt = new Date('2026-01-05T10:00:00Z');
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: 1,
          volunteerId: 100,
          volunteerDeletedAt: deletedAt,
          associationMemberDeletedAt: null,
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
    it('✅ Stocke volunteerDeletedAt si user est volunteer', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        volunteerId: 100,
        associationMemberId: 200,
        associationId: 42,
        volunteerDeletedAt: null,
        associationMemberDeletedAt: null,
      });
      mockPrisma.conversation.update.mockResolvedValue(undefined);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      await service.softDeleteForUser(100, 1);

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { volunteerDeletedAt: expect.any(Date) },
      });
      // resync unread count poussé par WS
      expect(mockEvents.sendUnreadCount).toHaveBeenCalledWith(100, 0);
    });

    it("✅ Stocke associationMemberDeletedAt si user est membre asso", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        volunteerId: 100,
        associationMemberId: 200,
        associationId: 42,
        volunteerDeletedAt: null,
        associationMemberDeletedAt: null,
      });
      mockPrisma.conversation.update.mockResolvedValue(undefined);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      await service.softDeleteForUser(200, 1);

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { associationMemberDeletedAt: expect.any(Date) },
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
        where: { associationId: 42 },
        reason: 'association_deleted',
      });
      expect(res).toEqual({ deletedCount: 0, notifiedUserIds: [] });
      expect(mockEvents.broadcastConversationDeleted).not.toHaveBeenCalled();
      expect(mockPrisma.conversation.deleteMany).not.toHaveBeenCalled();
    });

    it('✅ notifie les deux participants + supprime + resync compteurs', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 1, volunteerId: 100, associationMemberId: 200 },
        { id: 2, volunteerId: 100, associationMemberId: 300 },
      ]);
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.conversation.count.mockResolvedValue(0);

      const res = await service.deleteConversationsAndNotify({
        where: { associationId: 42 },
        reason: 'association_deleted',
      });

      expect(res.deletedCount).toBe(2);
      expect(res.notifiedUserIds.toSorted((a, b) => a - b)).toEqual([
        100, 200, 300,
      ]);
      // 4 notifications individuelles (2 convs × 2 users)
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalledTimes(4);
      // 3 unread:count (un par user distinct)
      expect(mockEvents.sendUnreadCount).toHaveBeenCalledTimes(3);
      expect(mockPrisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { associationId: 42 },
      });
    });

    it("✅ excludedUserId : ne notifie pas l'user supprimé", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 1, volunteerId: 100, associationMemberId: 200 },
      ]);
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.conversation.count.mockResolvedValue(0);

      await service.deleteConversationsAndNotify({
        where: { volunteerId: 100 },
        reason: 'user_deleted',
        excludedUserId: 100,
      });

      // Seul l'autre (200) doit être notifié
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalledTimes(1);
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalledWith(
        200,
        1,
        'user_deleted',
      );
    });

    it("✅ skipDelete=true : notifie sans supprimer (laisse la cascade Prisma faire)", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 5, volunteerId: 100, associationMemberId: 200 },
      ]);
      mockPrisma.conversation.count.mockResolvedValue(0);

      const res = await service.deleteConversationsAndNotify({
        where: { volunteerId: 100 },
        reason: 'user_deleted',
        skipDelete: true,
      });

      expect(res.deletedCount).toBe(0);
      expect(mockEvents.broadcastConversationDeleted).toHaveBeenCalled();
      expect(mockPrisma.conversation.deleteMany).not.toHaveBeenCalled();
    });

    it("✅ recalcule unread:count en EXCLUANT les conv en cours de suppression", async () => {
      // Scénario : A supprime son compte. Avant la cascade Prisma, on calcule
      // le unread:count pour B. Sans exclusion, les messages non-lus de la
      // conv condamnée seraient encore comptés → la pastille resterait
      // affichée même après que la conv ait disparu côté front.
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 42, volunteerId: 100, associationMemberId: 200 },
        { id: 43, volunteerId: 100, associationMemberId: 300 },
      ]);
      mockPrisma.conversation.count.mockResolvedValue(0);

      await service.deleteConversationsAndNotify({
        where: { volunteerId: 100 },
        reason: 'user_deleted',
        excludedUserId: 100,
        skipDelete: true,
      });

      // Tous les appels à count() doivent exclure les conv 42 et 43
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
