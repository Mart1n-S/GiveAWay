import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
  prisma: { user: { findUnique: jest.fn() } },
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
});
