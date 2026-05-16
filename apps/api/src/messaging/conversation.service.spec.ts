import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssociationStatus, UserStatus } from '../generated/prisma/client';

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
    findMany: jest.fn(),
    updateMany: jest.fn(),
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
      ],
    }).compile();
    service = module.get(ConversationService);
    jest.clearAllMocks();
  });

  // ==============================================================
  // assertOwnership
  // ==============================================================
  describe('assertOwnership', () => {
    it('✅ Retourne la conv quand le user est volunteer', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        volunteerId: 100,
        associationMemberId: 200,
        associationId: 42,
      });
      const res = await service.assertOwnership(1, 100);
      expect(res.id).toBe(1);
    });

    it('✅ Retourne la conv quand le user est associationMember', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        volunteerId: 100,
        associationMemberId: 200,
        associationId: 42,
      });
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
          messages: [lastMessage],
          _count: { messages: 3 },
        },
      ]);

      const res = await service.listConversations(100);
      expect(res).toHaveLength(1);
      expect(res[0].unreadCount).toBe(3);
      expect(res[0].lastMessage?.content).toBe('salut');
      expect(res[0].currentUserSide).toBe('volunteer');
      expect(res[0].otherUser.id).toBe(200);
    });

    it('✅ currentUserSide = associationMember si user est côté asso', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          ...baseConvInclude(),
          messages: [],
          _count: { messages: 0 },
        },
      ]);
      const res = await service.listConversations(200);
      expect(res[0].currentUserSide).toBe('associationMember');
      expect(res[0].otherUser.id).toBe(100);
    });
  });

  // ==============================================================
  // getUnreadCount
  // ==============================================================
  describe('getUnreadCount', () => {
    it('✅ Retourne le compteur', async () => {
      mockPrisma.conversation.count.mockResolvedValue(5);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(5);
    });

    it('✅ Retourne 0 si aucune conv non-lue', async () => {
      mockPrisma.conversation.count.mockResolvedValue(0);
      const res = await service.getUnreadCount(100);
      expect(res.count).toBe(0);
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
