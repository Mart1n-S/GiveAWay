import { Test, TestingModule } from '@nestjs/testing';
import { AssociationFollowService } from './association-follow.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  userAssociationFollow: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('AssociationFollowService', () => {
  let service: AssociationFollowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationFollowService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssociationFollowService>(AssociationFollowService);
    jest.clearAllMocks();
  });

  // =========================================================================
  // follow
  // =========================================================================
  describe('follow', () => {
    it('✅ appelle upsert avec les bons identifiants', async () => {
      mockPrisma.userAssociationFollow.upsert.mockResolvedValue({});

      await service.follow(1, 10);

      expect(mockPrisma.userAssociationFollow.upsert).toHaveBeenCalledWith({
        where: { userId_associationId: { userId: 1, associationId: 10 } },
        create: { userId: 1, associationId: 10 },
        update: {},
      });
    });

    it('✅ est idempotent (double appel ne lève pas)', async () => {
      mockPrisma.userAssociationFollow.upsert.mockResolvedValue({});

      await service.follow(1, 10);
      await service.follow(1, 10);

      expect(mockPrisma.userAssociationFollow.upsert).toHaveBeenCalledTimes(2);
    });

    it('✅ retourne void (undefined)', async () => {
      mockPrisma.userAssociationFollow.upsert.mockResolvedValue({});

      const result = await service.follow(1, 10);

      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // unfollow
  // =========================================================================
  describe('unfollow', () => {
    it('✅ appelle deleteMany avec les bons identifiants', async () => {
      mockPrisma.userAssociationFollow.deleteMany.mockResolvedValue({
        count: 1,
      });

      await service.unfollow(1, 10);

      expect(mockPrisma.userAssociationFollow.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, associationId: 10 },
      });
    });

    it("✅ ne lève pas si l'entrée n'existe pas (deleteMany count=0)", async () => {
      mockPrisma.userAssociationFollow.deleteMany.mockResolvedValue({
        count: 0,
      });

      await expect(service.unfollow(1, 99)).resolves.toBeUndefined();
    });

    it('✅ retourne void (undefined)', async () => {
      mockPrisma.userAssociationFollow.deleteMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.unfollow(1, 10);

      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // getStatus
  // =========================================================================
  describe('getStatus', () => {
    it('✅ retourne { isFollowing: true } si le follow existe', async () => {
      mockPrisma.userAssociationFollow.findUnique.mockResolvedValue({
        userId: 1,
        associationId: 10,
      });

      const result = await service.getStatus(1, 10);

      expect(result).toEqual({ isFollowing: true });
    });

    it('✅ retourne { isFollowing: false } si le follow est absent', async () => {
      mockPrisma.userAssociationFollow.findUnique.mockResolvedValue(null);

      const result = await service.getStatus(1, 10);

      expect(result).toEqual({ isFollowing: false });
    });

    it('✅ appelle findUnique avec la bonne clé composite', async () => {
      mockPrisma.userAssociationFollow.findUnique.mockResolvedValue(null);

      await service.getStatus(7, 42);

      expect(mockPrisma.userAssociationFollow.findUnique).toHaveBeenCalledWith({
        where: { userId_associationId: { userId: 7, associationId: 42 } },
      });
    });
  });
});
