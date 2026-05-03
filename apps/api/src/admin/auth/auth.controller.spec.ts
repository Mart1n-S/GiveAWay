import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AdminAuthController } from './auth.controller';
import { AdminAuthService } from './auth.service';
import { AdminCookieService } from './cookie.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { AdminRole } from '@repo/shared';
import { Admin as PrismaAdmin } from '../../generated/prisma/client';

const baseAdmin: PrismaAdmin = {
  id: 1,
  email: 'admin@test.fr',
  password: 'hashed',
  firstName: 'Admin',
  lastName: 'Test',
  role: 'ADMIN' as PrismaAdmin['role'],
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01'),
};

const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
  buildAuthResponse: jest.fn(),
  changePassword: jest.fn(),
  mapAdminToResponse: jest.fn(),
  prisma: {
    admin: { findUniqueOrThrow: jest.fn() },
  },
};

const mockCookieService = {
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
};

const buildRes = () =>
  ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as unknown as Response;

const buildReq = (opts: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  user?: { id: number; role: AdminRole };
}) =>
  ({
    cookies: opts.cookies ?? {},
    headers: { 'user-agent': 'TestAgent', ...(opts.headers ?? {}) },
    user: opts.user,
  }) as unknown as AuthenticatedRequest;

describe('AdminAuthController', () => {
  let controller: AdminAuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminCookieService, useValue: mockCookieService },
      ],
    }).compile();

    controller = module.get(AdminAuthController);
  });

  describe('login', () => {
    it('appelle authService.login, pose les cookies et retourne buildAuthResponse', async () => {
      mockAuthService.login.mockResolvedValue({
        admin: baseAdmin,
        accessToken: 'at',
        refreshToken: 'rt',
      });
      mockAuthService.buildAuthResponse.mockReturnValue({ message: 'ok' });

      const res = buildRes();
      const req = buildReq({});
      const result = await controller.login(
        { email: 'admin@test.fr', password: 'pass' },
        res,
        req,
        '127.0.0.1',
        'web',
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: 'admin@test.fr', password: 'pass' },
        'TestAgent',
        '127.0.0.1',
      );
      expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        res,
        'at',
        'rt',
      );
      expect(mockAuthService.buildAuthResponse).toHaveBeenCalledWith(
        'web',
        baseAdmin,
        'at',
        'rt',
        'Connexion admin réussie',
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('logout', () => {
    it('déconnecte via le cookie refresh token', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const res = buildRes();
      const req = buildReq({
        cookies: { admin_refresh_token: 'cookie-rt' },
        user: { id: 1, role: AdminRole.ADMIN },
      });

      const result = await controller.logout(
        { id: 1, email: 'admin@test.fr', role: AdminRole.ADMIN },
        req,
        res,
        {},
      );

      expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'cookie-rt');
      expect(mockCookieService.clearAuthCookies).toHaveBeenCalledWith(res);
      expect(result).toEqual({ message: 'Déconnecté' });
    });

    it('déconnecte via le body refresh token si pas de cookie', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const res = buildRes();
      const req = buildReq({
        user: { id: 1, role: AdminRole.ADMIN },
      });

      await controller.logout(
        { id: 1, email: 'admin@test.fr', role: AdminRole.ADMIN },
        req,
        res,
        { refreshToken: 'body-rt' },
      );

      expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'body-rt');
    });

    it('ne déconnecte pas si aucun refresh token disponible', async () => {
      const res = buildRes();
      const req = buildReq({ user: { id: 1, role: AdminRole.ADMIN } });

      await controller.logout(
        { id: 1, email: 'admin@test.fr', role: AdminRole.ADMIN },
        req,
        res,
        {},
      );

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockCookieService.clearAuthCookies).toHaveBeenCalledWith(res);
    });
  });

  describe('refresh', () => {
    it('rafraîchit les tokens et retourne buildAuthResponse', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      });
      mockAuthService.buildAuthResponse.mockReturnValue({
        message: 'refreshed',
      });

      const res = buildRes();
      const req = {
        ...buildReq({}),
        user: { sub: 1, refreshToken: 'old-rt' },
        headers: { 'user-agent': 'TestAgent' },
      } as unknown as AuthenticatedRequest;

      const result = await controller.refresh(req, res, '127.0.0.1', 'mobile');

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        1,
        'old-rt',
        'TestAgent',
        '127.0.0.1',
      );
      expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        res,
        'new-at',
        'new-rt',
      );
      expect(result).toEqual({ message: 'refreshed' });
    });
  });

  describe('me', () => {
    it("retourne l'admin courant mappé", async () => {
      mockAuthService.prisma.admin.findUniqueOrThrow.mockResolvedValue(
        baseAdmin,
      );
      mockAuthService.mapAdminToResponse.mockReturnValue({
        id: 1,
        email: 'admin@test.fr',
      });

      const result = await controller.me({
        id: 1,
        email: 'admin@test.fr',
        role: AdminRole.ADMIN,
      });

      expect(
        mockAuthService.prisma.admin.findUniqueOrThrow,
      ).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ admin: { id: 1, email: 'admin@test.fr' } });
    });
  });

  describe('changePassword', () => {
    it('appelle changePassword et retourne un message de succès', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        { id: 1, email: 'admin@test.fr', role: AdminRole.ADMIN },
        { currentPassword: 'old', newPassword: 'New!123' },
      );

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        1,
        'old',
        'New!123',
      );
      expect(result).toEqual({ message: 'Mot de passe modifié' });
    });
  });
});
