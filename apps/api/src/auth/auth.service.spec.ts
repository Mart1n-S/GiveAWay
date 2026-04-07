import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenType } from '../generated/prisma/client';
import { UserWithRelations } from './auth.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  token: { deleteMany: jest.fn(), create: jest.fn() },
  refreshToken: { create: jest.fn() },
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('fake_token'),
};

const basePrismaUser: UserWithRelations = {
  id: 1,
  email: 'test@test.com',
  firstName: 'John',
  lastName: 'Doe',
  age: 25,
  biography: 'Bio',
  profilePicture: null,
  password: 'hash',
  googleId: null,
  emailVerifiedAt: new Date(),
  termsAcceptedAt: null,
  deletedAt: null,
  addressId: null,
  status: 'ACTIVE' as any,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
  emailNotifications: true,
  address: {
    id: 10,
    street: 'Rue Test',
    postalCode: '75000',
    city: 'Paris',
    latitude: 48.85 as any,
    longitude: 2.35 as any,
  },
  associations: [
    {
      associationId: 5,
      role: 'PRESIDENT' as any,
      association: { name: 'Asso Test' },
    } as any,
  ],
};

const mockConfig = {
  getOrThrow: jest.fn((key: string): string => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key];
  }),
};

describe('AuthService (shared helpers)', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // checkEmailAvailability
  // ----------------------------------------------------------------
  describe('checkEmailAvailability', () => {
    it("✅ Ne doit rien faire si l'email est libre", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.checkEmailAvailability('libre@test.com'),
      ).resolves.not.toThrow();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'libre@test.com' },
        select: { id: true },
      });
    });

    it("❌ Doit lever ConflictException si l'email est pris par un user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.checkEmailAvailability('pris@test.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ----------------------------------------------------------------
  // generateTokens
  // ----------------------------------------------------------------
  describe('generateTokens', () => {
    it('✅ Doit générer un accessToken et un refreshToken en parallèle', async () => {
      const result = await service.generateTokens(1, 'test@test.com');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwt.signAsync).toHaveBeenCalledTimes(2);
    });

    it("❌ Doit propager l'erreur si la config est manquante", async () => {
      mockConfig.getOrThrow.mockImplementationOnce(() => {
        throw new Error('Missing config');
      });

      await expect(service.generateTokens(1, 'test@test.com')).rejects.toThrow(
        'Missing config',
      );
    });
  });

  // ----------------------------------------------------------------
  // saveRefreshToken
  // ----------------------------------------------------------------
  describe('saveRefreshToken', () => {
    it('✅ Doit hasher le token et le sauvegarder en BDD', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 1 });

      await service.saveRefreshToken(1, 'raw_token', 'Mozilla', '127.0.0.1');

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          userAgent: 'Mozilla',
          ip: '127.0.0.1',
        }),
      });
    });

    it("❌ Doit propager l'erreur si Prisma échoue", async () => {
      mockPrisma.refreshToken.create.mockRejectedValue(new Error('DB_ERROR'));

      await expect(
        service.saveRefreshToken(1, 'raw_token', 'Mozilla', '127.0.0.1'),
      ).rejects.toThrow('DB_ERROR');
    });
  });

  // ----------------------------------------------------------------
  // generateAndSaveToken
  // ----------------------------------------------------------------
  describe('generateAndSaveToken', () => {
    it('✅ Doit supprimer les anciens tokens, créer un nouveau et retourner le code brut', async () => {
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 99 });

      const code = await service.generateAndSaveToken(
        1,
        TokenType.EMAIL_VERIFICATION,
      );

      expect(mockPrisma.token.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, type: TokenType.EMAIL_VERIFICATION },
      });
      expect(mockPrisma.token.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 1 }),
        }),
      );
      expect(typeof code).toBe('string');
      expect(code).toHaveLength(6);
    });

    it("❌ Doit propager l'erreur si Prisma échoue", async () => {
      mockPrisma.token.deleteMany.mockRejectedValue(new Error('DB_ERROR'));

      await expect(
        service.generateAndSaveToken(1, TokenType.EMAIL_VERIFICATION),
      ).rejects.toThrow('DB_ERROR');
    });
  });

  // ----------------------------------------------------------------
  // mapUserToResponse
  // ----------------------------------------------------------------
  describe('mapUserToResponse', () => {
    it('✅ Doit mapper correctement un user Prisma complet vers le DTO partagé', () => {
      const result = service.mapUserToResponse(basePrismaUser);

      expect(result.id).toBe(1);
      expect(result.email).toBe('test@test.com');
      expect(typeof result.createdAt).toBe('string');
      expect(result.address?.city).toBe('Paris');
      expect(result.address?.latitude).toBe(48.85);
      expect(result.associations).toHaveLength(1);
      expect(result.associations?.[0]?.name).toBe('Asso Test');
    });

    it('✅ Doit gérer un user sans adresse ni associations', () => {
      const minimalUser: UserWithRelations = {
        ...basePrismaUser,
        id: 2,
        email: 'minimal@test.com',
        firstName: 'Min',
        lastName: 'Imal',
        age: null,
        biography: null,
        profilePicture: null,
        address: null,
        associations: [],
      };

      const result = service.mapUserToResponse(minimalUser);

      expect(result.address).toBeNull();
      expect(result.associations).toEqual([]);
    });
  });
});
