import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { LoginService } from './login.service';
import { AuthService } from '../auth.service';
import { CookieService } from '../shared/cookie.service';
import { UserStatus } from '../../generated/prisma/client';
import { Response } from 'express';

const mockUser = {
  id: 1,
  email: 'test@test.com',
  password: 'hashed_password',
  firstName: 'Test',
  lastName: 'User',
  age: 25,
  biography: null,
  profilePicture: null,
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  address: {
    id: 1,
    street: 'Rue de la Paix',
    postalCode: '75000',
    city: 'Paris',
    latitude: null,
    longitude: null,
  },
  associations: [],
};

const mockAuthService = {
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any,
  },
  logger: { warn: jest.fn(), error: jest.fn() },
  generateTokens: jest.fn().mockResolvedValue({
    accessToken: 'at',
    refreshToken: 'rt',
  }),
  saveRefreshToken: jest.fn().mockResolvedValue(undefined),
  mapUserToResponse: jest
    .fn()
    .mockReturnValue({ id: 1, email: 'test@test.com' }),
};

const mockCookieService = { setAuthCookies: jest.fn() };

const mockConfig = {
  get: jest.fn().mockReturnValue('google-client-id'),
};

const mockResponse = {} as Response;

describe('LoginService', () => {
  let service: LoginService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: CookieService, useValue: mockCookieService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('✅ Login réussi — pose les cookies et retourne la réponse web', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@test.com', password: 'pass' },
        mockResponse,
        'Mozilla',
        '127.0.0.1',
      );

      expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        mockResponse,
        'at',
        'rt',
      );
      expect(result).toHaveProperty('message', 'Connexion réussie');
      expect(result).not.toHaveProperty('backendTokens');
    });

    it('✅ Login mobile — inclut backendTokens dans la réponse', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@test.com', password: 'pass' },
        mockResponse,
        'Mozilla',
        '127.0.0.1',
        'mobile',
      );

      expect(result).toHaveProperty('backendTokens');
      expect(result.backendTokens?.accessToken).toBe('at');
    });

    it('❌ Doit lever BadRequestException si user non trouvé', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'test@test.com', password: 'pass' },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("❌ Doit lever ForbiddenException si l'email n'est pas vérifié", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerifiedAt: null,
      });

      await expect(
        service.login(
          { email: 'test@test.com', password: 'pass' },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('❌ Doit lever BadRequestException si mot de passe incorrect', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'test@test.com', password: 'wrong' },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ Doit lever ForbiddenException si compte suspendu', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login(
          { email: 'test@test.com', password: 'pass' },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('googleLogin', () => {
    const mockGoogleUser = {
      id: 2,
      email: 'google@test.com',
      password: null,
      googleId: 'google-sub-123',
      firstName: 'Google',
      lastName: 'USER',
      age: null,
      biography: null,
      profilePicture: 'https://photo.url',
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      address: null,
      associations: [],
    };

    beforeEach(() => {
      // Reset du fetch global avant chaque test
      global.fetch = jest.fn();
    });

    // Cas isAccessToken: true (Web)

    it('✅ [Web] Crée un compte si utilisateur inconnu via UserInfo', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          email: 'google@test.com',
          sub: 'google-sub-123',
          given_name: 'Google',
          family_name: 'User',
          picture: 'https://photo.url',
        }),
      });

      mockAuthService.prisma.user = {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockGoogleUser),
        update: jest.fn(),
      };

      const result = await service.googleLogin(
        { idToken: 'access_token_web', isAccessToken: true },
        mockResponse,
        'Mozilla',
        '127.0.0.1',
        'web',
      );

      expect(mockAuthService.prisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Connexion réussie');
      expect(result).not.toHaveProperty('backendTokens');
    });

    it('✅ [Web] Connecte un utilisateur Google existant', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          email: 'google@test.com',
          sub: 'google-sub-123',
          given_name: 'Google',
          family_name: 'User',
          picture: 'https://photo.url',
        }),
      });

      mockAuthService.prisma.user = {
        findFirst: jest.fn().mockResolvedValue(mockGoogleUser),
        create: jest.fn(),
        update: jest.fn(),
      };

      const result = await service.googleLogin(
        { idToken: 'access_token_web', isAccessToken: true },
        mockResponse,
        'Mozilla',
        '127.0.0.1',
        'web',
      );

      expect(mockAuthService.prisma.user.create).not.toHaveBeenCalled();
      expect(mockAuthService.prisma.user.update).not.toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Connexion réussie');
    });

    it('✅ [Web] Lie le googleId à un compte existant sans googleId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          email: 'google@test.com',
          sub: 'google-sub-123',
          given_name: 'Google',
          family_name: 'User',
          picture: 'https://photo.url',
        }),
      });

      const userWithoutGoogleId = { ...mockGoogleUser, googleId: null };

      mockAuthService.prisma.user = {
        findFirst: jest.fn().mockResolvedValue(userWithoutGoogleId),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(mockGoogleUser),
      };

      await service.googleLogin(
        { idToken: 'access_token_web', isAccessToken: true },
        mockResponse,
        'Mozilla',
        '127.0.0.1',
        'web',
      );

      expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userWithoutGoogleId.id },
          data: expect.objectContaining({ googleId: 'google-sub-123' }),
        }),
      );
    });

    it('❌ [Web] Lève UnauthorizedException si UserInfo endpoint échoue', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(
        service.googleLogin(
          { idToken: 'invalid_token', isAccessToken: true },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ [Web] Lève ForbiddenException si compte suspendu', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          email: 'google@test.com',
          sub: 'google-sub-123',
          given_name: 'Google',
          family_name: 'User',
          picture: null,
        }),
      });

      mockAuthService.prisma.user = {
        findFirst: jest.fn().mockResolvedValue({
          ...mockGoogleUser,
          status: UserStatus.SUSPENDED,
        }),
        create: jest.fn(),
        update: jest.fn(),
      };

      await expect(
        service.googleLogin(
          { idToken: 'access_token_web', isAccessToken: true },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    // Cas isAccessToken: false (Mobile)

    it('✅ [Mobile] Connecte via id_token JWT valide', async () => {
      const mockTicket = {
        getPayload: jest.fn().mockReturnValue({
          email: 'google@test.com',
          sub: 'google-sub-123',
          given_name: 'Google',
          family_name: 'User',
          picture: 'https://photo.url',
        }),
      };

      // Mock de verifyIdToken sur l'instance googleClient
      jest
        .spyOn(service['googleClient'], 'verifyIdToken')
        .mockResolvedValue(mockTicket as never);

      mockAuthService.prisma.user = {
        findFirst: jest.fn().mockResolvedValue(mockGoogleUser),
        create: jest.fn(),
        update: jest.fn(),
      };

      const result = await service.googleLogin(
        { idToken: 'valid_id_token', isAccessToken: false },
        mockResponse,
        'Mozilla',
        '127.0.0.1',
        'mobile',
      );

      expect(result).toHaveProperty('backendTokens');
      expect(result.backendTokens?.accessToken).toBe('at');
    });

    it('❌ [Mobile] Lève UnauthorizedException si id_token invalide', async () => {
      jest
        .spyOn(service['googleClient'], 'verifyIdToken')
        .mockRejectedValue(new Error('Token malformé') as never);

      await expect(
        service.googleLogin(
          { idToken: 'invalid_id_token', isAccessToken: false },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ [Mobile] Lève UnauthorizedException si payload vide', async () => {
      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(null),
      };

      jest
        .spyOn(service['googleClient'], 'verifyIdToken')
        .mockResolvedValue(mockTicket as never);

      await expect(
        service.googleLogin(
          { idToken: 'valid_id_token', isAccessToken: false },
          mockResponse,
          'Mozilla',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
