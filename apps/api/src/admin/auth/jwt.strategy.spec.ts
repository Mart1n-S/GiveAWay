import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminJwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '@repo/shared';

const mockPrisma = {
  admin: { findUnique: jest.fn() },
};

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'JWT_ADMIN_ACCESS_SECRET') return 'test-secret';
    throw new Error(`Unknown key: ${key}`);
  }),
};

const basePayload = {
  sub: '1',
  email: 'admin@test.fr',
  scope: 'admin' as const,
  role: AdminRole.ADMIN,
};

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new AdminJwtStrategy(
      mockConfig as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('validate', () => {
    it("retourne l'admin si payload valide et admin trouvé en BDD", async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 1,
        email: 'admin@test.fr',
        role: 'ADMIN',
      });

      const result = await strategy.validate(basePayload);

      expect(result).toEqual({
        id: 1,
        email: 'admin@test.fr',
        role: AdminRole.ADMIN,
      });
      expect(mockPrisma.admin.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, email: true, role: true },
      });
    });

    it('throw UnauthorizedException si scope !== "admin"', async () => {
      const invalidPayload = {
        ...basePayload,
        scope: 'user' as unknown as 'admin',
      };
      await expect(strategy.validate(invalidPayload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(mockPrisma.admin.findUnique).not.toHaveBeenCalled();
    });

    it('throw UnauthorizedException si admin introuvable en BDD', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      await expect(strategy.validate(basePayload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('convertit sub (string) en nombre pour la recherche', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 42,
        email: 'super@test.fr',
        role: 'SUPER_ADMIN',
      });

      await strategy.validate({ ...basePayload, sub: '42' });

      expect(mockPrisma.admin.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        select: expect.any(Object),
      });
    });
  });
});
