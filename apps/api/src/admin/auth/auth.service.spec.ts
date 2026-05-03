import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Response } from 'express';
import { AdminAuthService } from './auth.service';
import { AdminCookieService } from './cookie.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Admin as PrismaAdmin } from '../../generated/prisma/client';

const mockPrisma = {
  admin: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  adminRefreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockJwt = {
  signAsync: jest.fn(),
};

const mockConfig = {
  getOrThrow: jest.fn((key: string): string => {
    const map: Record<string, string> = {
      JWT_ADMIN_ACCESS_SECRET: 'access-secret',
      JWT_ADMIN_REFRESH_SECRET: 'refresh-secret',
    };
    return map[key];
  }),
  get: jest.fn((key: string): string | undefined => {
    const map: Record<string, string> = {
      JWT_ADMIN_ACCESS_EXPIRES_IN: '15m',
      JWT_ADMIN_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key];
  }),
};

const baseAdmin: PrismaAdmin = {
  id: 1,
  email: 'admin@x.fr',
  password: 'hashed',
  firstName: 'A',
  lastName: 'B',
  role: 'ADMIN' as PrismaAdmin['role'],
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01'),
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AdminAuthService);
  });

  describe('mapAdminToResponse', () => {
    it('mappe correctement (formate les dates ISO, dates null gérées)', () => {
      const res = service.mapAdminToResponse({
        ...baseAdmin,
        lastLoginAt: new Date('2026-02-02'),
      });
      expect(res.email).toBe('admin@x.fr');
      expect(res.lastLoginAt).toBe(new Date('2026-02-02').toISOString());
      expect(res.createdAt).toBe(baseAdmin.createdAt.toISOString());

      const res2 = service.mapAdminToResponse(baseAdmin);
      expect(res2.lastLoginAt).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('signe access + refresh en parallèle avec les bons secrets', async () => {
      const tokens = await service.generateTokens(baseAdmin);
      expect(tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockJwt.signAsync).toHaveBeenCalledTimes(2);
      const accessCall = mockJwt.signAsync.mock.calls[0];
      expect(accessCall[1]).toEqual(
        expect.objectContaining({ secret: 'access-secret', expiresIn: '15m' }),
      );
      const refreshCall = mockJwt.signAsync.mock.calls[1];
      expect(refreshCall[1]).toEqual(
        expect.objectContaining({ secret: 'refresh-secret', expiresIn: '7d' }),
      );
      expect((accessCall[0] as { role: string }).role).toBe(baseAdmin.role);
      expect((refreshCall[0] as { role?: string }).role).toBeUndefined();
    });
  });

  describe('saveRefreshToken', () => {
    it('hash le token et persiste avec userAgent + ip', async () => {
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-token');
      mockPrisma.adminRefreshToken.create.mockResolvedValue({});
      await service.saveRefreshToken(1, 'token-x', 'UA', '127.0.0.1');
      expect(mockPrisma.adminRefreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: 1,
          hashedToken: 'hashed-token',
          userAgent: 'UA',
          ip: '127.0.0.1',
        }),
      });
    });
  });

  describe('login', () => {
    it('throw 401 si email inconnu', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@x.fr', password: 'p' }, 'UA', 'ip'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throw 401 si password incorrect', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(baseAdmin);
      jest.spyOn(argon2, 'verify').mockResolvedValueOnce(false);
      await expect(
        service.login({ email: 'admin@x.fr', password: 'wrong' }, 'UA', 'ip'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('login OK : update lastLoginAt + retourne tokens', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(baseAdmin);
      jest.spyOn(argon2, 'verify').mockResolvedValueOnce(true);
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-token');
      mockPrisma.adminRefreshToken.create.mockResolvedValue({});
      mockPrisma.admin.update.mockResolvedValue({
        ...baseAdmin,
        lastLoginAt: new Date(),
      });

      const res = await service.login(
        { email: 'admin@x.fr', password: 'p' },
        'UA',
        'ip',
      );
      expect(res.accessToken).toBe('access-token');
      expect(res.refreshToken).toBe('refresh-token');
      expect(mockPrisma.admin.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it('parcourt les tokens et supprime celui qui matche', async () => {
      mockPrisma.adminRefreshToken.findMany.mockResolvedValue([
        { id: 't1', hashedToken: 'h1' },
        { id: 't2', hashedToken: 'h2' },
      ]);
      const verifySpy = jest.spyOn(argon2, 'verify');
      verifySpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      await service.logout(1, 'plain');
      expect(mockPrisma.adminRefreshToken.delete).toHaveBeenCalledWith({
        where: { id: 't2' },
      });
    });

    it('ignore les erreurs argon (continue le loop)', async () => {
      mockPrisma.adminRefreshToken.findMany.mockResolvedValue([
        { id: 't1', hashedToken: 'h1' },
      ]);
      jest.spyOn(argon2, 'verify').mockRejectedValueOnce(new Error('boom'));
      await expect(service.logout(1, 'plain')).resolves.toBeUndefined();
      expect(mockPrisma.adminRefreshToken.delete).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('throw 403 si aucun token ne matche', async () => {
      mockPrisma.adminRefreshToken.findMany.mockResolvedValue([
        { id: 't1', hashedToken: 'h1' },
      ]);
      jest.spyOn(argon2, 'verify').mockResolvedValueOnce(false);
      await expect(
        service.refresh(1, 'tok', 'UA', 'ip'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rotate : supprime ancien et sauvegarde nouveau', async () => {
      mockPrisma.adminRefreshToken.findMany.mockResolvedValue([
        { id: 't1', hashedToken: 'h1' },
      ]);
      jest.spyOn(argon2, 'verify').mockResolvedValueOnce(true);
      mockPrisma.admin.findUniqueOrThrow.mockResolvedValue(baseAdmin);
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-new');
      const tokens = await service.refresh(1, 'tok', 'UA', 'ip');
      expect(tokens.accessToken).toBe('access-token');
      expect(mockPrisma.adminRefreshToken.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
      expect(mockPrisma.adminRefreshToken.create).toHaveBeenCalled();
    });
  });

  describe('buildAuthResponse', () => {
    it('mobile : retourne backendTokens', () => {
      const res = service.buildAuthResponse(
        'mobile',
        baseAdmin,
        'a',
        'r',
        'msg',
      );
      expect(res.backendTokens).toEqual({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 15 * 60 * 1000,
      });
      expect(res.admin?.email).toBe('admin@x.fr');
    });

    it('web : pas de backendTokens', () => {
      const res = service.buildAuthResponse(
        undefined,
        baseAdmin,
        'a',
        'r',
        'msg',
      );
      expect(res.backendTokens).toBeUndefined();
    });

    it('admin sans payload (ex: refresh) → admin undefined', () => {
      const res = service.buildAuthResponse(
        'mobile',
        undefined,
        'a',
        'r',
        'msg',
      );
      expect(res.admin).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    it('throw BadRequest si mot de passe actuel faux', async () => {
      mockPrisma.admin.findUniqueOrThrow.mockResolvedValue(baseAdmin);
      jest.spyOn(argon2, 'verify').mockResolvedValueOnce(false);
      await expect(
        service.changePassword(1, 'old', 'new'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('OK : met à jour le hash et désactive mustChangePassword', async () => {
      mockPrisma.admin.findUniqueOrThrow.mockResolvedValue(baseAdmin);
      jest.spyOn(argon2, 'verify').mockResolvedValueOnce(true);
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('new-hash');
      mockPrisma.admin.update.mockResolvedValue(baseAdmin);
      await service.changePassword(1, 'old', 'new');
      expect(mockPrisma.admin.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'new-hash', mustChangePassword: false },
      });
    });
  });
});

describe('AdminCookieService', () => {
  const cookie = new AdminCookieService();
  const buildRes = () => {
    const calls: Record<string, unknown[]> = { cookie: [], clearCookie: [] };
    const res = {
      cookie: jest.fn((...args: unknown[]) => {
        calls.cookie.push(args);
        return res;
      }),
      clearCookie: jest.fn((...args: unknown[]) => {
        calls.clearCookie.push(args);
        return res;
      }),
    } as unknown as Response & { cookie: jest.Mock; clearCookie: jest.Mock };
    return { res, calls };
  };

  it('setAuthCookies pose les 2 cookies httpOnly', () => {
    const { res } = buildRes();
    cookie.setAuthCookies(res, 'a', 'r');
    expect(res.cookie).toHaveBeenCalledWith(
      'admin_access_token',
      'a',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'admin_refresh_token',
      'r',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('clearAuthCookies efface les 2 cookies', () => {
    const { res } = buildRes();
    cookie.clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith('admin_access_token');
    expect(res.clearCookie).toHaveBeenCalledWith('admin_refresh_token');
  });
});
