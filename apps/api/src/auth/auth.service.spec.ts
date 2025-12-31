import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UserStatus } from '../generated/prisma/client';
import * as argon2 from 'argon2';
import { RegisterDto } from '@repo/shared';

describe('AuthService (Unit)', () => {
  let service: AuthService;

  // --- MOCKS ---
  // On utilise Record<string, any> ou des types plus précis pour calmer le linter
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    token: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('fake_token'),
  };

  const mockMail = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. REGISTER
  // ===========================================================================
  describe('register', () => {
    const dto: RegisterDto = {
      email: 'test@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      age: 20,
      acceptTerms: true,
      address: { street: 'A', city: 'B', postalCode: '12345' },
    };

    it('✅ Inscription réussie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 1, email: dto.email });

      const res = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockMail.sendVerificationEmail).toHaveBeenCalled();
      expect(res.message).toContain('Inscription réussie');
    });

    it('❌ Doit lever ConflictException si email déjà pris', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ===========================================================================
  // 2. VERIFY EMAIL
  // ===========================================================================
  describe('verifyEmail', () => {
    it('✅ Validation réussie', async () => {
      const dbToken = {
        id: 10,
        userId: 1,
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.token.findUnique.mockResolvedValue(dbToken);

      const res = await service.verifyEmail('raw-token');

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.token.delete).toHaveBeenCalled();
      expect(res.message).toContain('validé avec succès');
    });

    it('❌ Doit lever Unauthorized si token inexistant', async () => {
      mockPrisma.token.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ===========================================================================
  // 3. LOGIN
  // ===========================================================================
  describe('login', () => {
    const loginData = { email: 'test@test.com', password: 'Password123!' };

    it('✅ Login réussi', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        password: 'hashed_password',
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      });
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      const res = await service.login(loginData, 'agent', 'ip');

      expect(res).toHaveProperty('accessToken');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('❌ Doit lever Unauthorized si mdp incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        password: 'h',
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      });
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.login(loginData, 'a', 'i')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ===========================================================================
  // 4. LOGOUT
  // ===========================================================================
  describe('logout', () => {
    it('✅ Doit supprimer le refresh token correspondant', async () => {
      const mockTokens = [
        { id: 1, hashedToken: 'hash1' },
        { id: 2, hashedToken: 'hash2' },
      ];
      mockPrisma.refreshToken.findMany.mockResolvedValue(mockTokens);

      // On retire le "async" et on retourne une Promise résolue manuellement
      // pour satisfaire l'interface de argon2.verify qui attend une Promise
      jest
        .spyOn(argon2, 'verify')
        .mockImplementation((h) => Promise.resolve(h === 'hash2'));

      await service.logout(1, 'raw_token_2');

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });
  });

  // ===========================================================================
  // 5. REFRESH TOKENS
  // ===========================================================================
  describe('refreshTokens', () => {
    it('✅ Rotation réussie', async () => {
      const oldToken = {
        id: 100,
        hashedToken: 'old_hash',
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.refreshToken.findMany.mockResolvedValue([oldToken]);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        email: 't@t.com',
        status: UserStatus.ACTIVE,
      });

      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      const res = await service.refreshTokens(1, 'old_raw', 'agent', 'ip');

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 100 },
      });
      expect(res).toHaveProperty('accessToken');
    });

    it('❌ Doit lever Forbidden si token expiré', async () => {
      const expiredToken = {
        id: 1,
        hashedToken: 'h1',
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrisma.refreshToken.findMany.mockResolvedValue([expiredToken]);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      await expect(service.refreshTokens(1, 'raw', 'a', 'i')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===========================================================================
  // 6. RESEND VERIFICATION
  // ===========================================================================
  describe('resendVerificationEmail', () => {
    const email = 'test@test.com';

    it("✅ Doit simuler un succès même si l'utilisateur n'existe pas (Anti-énumération)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await service.resendVerificationEmail(email);

      expect(res.message).toContain('un nouveau lien a été envoyé');
      expect(mockMail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("✅ Doit simuler un succès si l'email est déjà validé", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email,
        emailVerifiedAt: new Date(),
      });

      const res = await service.resendVerificationEmail(email);

      expect(res.message).toContain('un nouveau lien a été envoyé');
      expect(mockMail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("✅ Doit envoyer un nouveau mail si l'utilisateur est PENDING", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email,
        emailVerifiedAt: null,
      });
      // Mock pour le helper generateAndSaveToken appelé en interne
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 99 });

      const res = await service.resendVerificationEmail(email);

      expect(mockMail.sendVerificationEmail).toHaveBeenCalled();
      expect(res.message).toContain('un nouveau lien a été envoyé');
    });

    it("❌ Doit propager l'erreur si Prisma crash lors de la recherche", async () => {
      // On simule une erreur de connexion à la base de données
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB_ERROR'));

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(
        'DB_ERROR',
      );
    });

    it("❌ Doit propager l'erreur si l'envoi d'email crash", async () => {
      // 1. L'utilisateur existe et doit recevoir un mail
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email,
        emailVerifiedAt: null,
      });
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 99 });

      // 2. On simule un crash du service mail (ex: API Mailgun/Sendgrid en panne)
      mockMail.sendVerificationEmail.mockRejectedValue(
        new Error('MAIL_SERVER_DOWN'),
      );

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(
        'MAIL_SERVER_DOWN',
      );
    });
  });
});
