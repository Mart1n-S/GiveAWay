import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../generated/prisma/client';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  // On crée des mocks typés via unknown
  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  } as unknown as ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    // On injecte les mocks transtypés proprement
    strategy = new JwtStrategy(mockConfigService, mockPrismaService);
  });

  describe('validate', () => {
    it('✅ devrait retourner l utilisateur si actif', async () => {
      const user = { id: 1, email: 't@t.com', status: UserStatus.ACTIVE };
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate({ sub: '1', email: 't@t.com' });

      expect(result).toEqual(user);
    });

    it('❌ devrait throw Unauthorized si l utilisateur n existe pas', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: '1', email: 't@t.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("❌ devrait throw Unauthorized si l'utilisateur n est pas ACTIVE", async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        strategy.validate({ sub: '1', email: 't@t.com' }),
      ).rejects.toThrow('Votre compte est suspendu ou désactivé');
    });
  });
});
