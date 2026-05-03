import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AdminJwtRefreshStrategy } from './jwt-refresh.strategy';

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'JWT_ADMIN_REFRESH_SECRET') return 'refresh-secret';
    throw new Error(`Unknown key: ${key}`);
  }),
};

const basePayload = {
  sub: '1',
  email: 'admin@test.fr',
  scope: 'admin' as const,
};

const buildRequest = (opts: {
  cookies?: Record<string, string>;
  authHeader?: string;
}): Request =>
  ({
    cookies: opts.cookies ?? {},
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
  }) as unknown as Request;

describe('AdminJwtRefreshStrategy', () => {
  let strategy: AdminJwtRefreshStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new AdminJwtRefreshStrategy(
      mockConfig as unknown as ConfigService,
    );
  });

  describe('validate', () => {
    it('retourne le payload avec refreshToken issu du cookie', () => {
      const req = buildRequest({
        cookies: { admin_refresh_token: 'cookie-refresh-token' },
      });

      const result = strategy.validate(req, basePayload);

      expect(result).toEqual({
        sub: 1,
        email: 'admin@test.fr',
        refreshToken: 'cookie-refresh-token',
      });
    });

    it('retourne le payload avec refreshToken issu du header Authorization', () => {
      const req = buildRequest({
        authHeader: 'Bearer bearer-refresh-token',
      });

      const result = strategy.validate(req, basePayload);

      expect(result).toEqual({
        sub: 1,
        email: 'admin@test.fr',
        refreshToken: 'bearer-refresh-token',
      });
    });

    it('throw ForbiddenException si scope !== "admin"', () => {
      const req = buildRequest({
        cookies: { admin_refresh_token: 'tok' },
      });
      const invalidPayload = {
        ...basePayload,
        scope: 'user' as unknown as 'admin',
      };

      expect(() => strategy.validate(req, invalidPayload)).toThrow(
        ForbiddenException,
      );
    });

    it('throw ForbiddenException si aucun refresh token disponible', () => {
      const req = buildRequest({});

      expect(() => strategy.validate(req, basePayload)).toThrow(
        ForbiddenException,
      );
    });

    it('convertit sub (string) en nombre', () => {
      const req = buildRequest({
        cookies: { admin_refresh_token: 'tok' },
      });

      const result = strategy.validate(req, { ...basePayload, sub: '99' });

      expect(result.sub).toBe(99);
    });
  });
});
