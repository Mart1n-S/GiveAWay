import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  // Mock typé pour ConfigService
  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
  } as unknown as ConfigService;

  beforeEach(() => {
    strategy = new JwtRefreshStrategy(mockConfigService);
  });

  describe('validate', () => {
    it('✅ devrait valider avec un token venant des cookies', () => {
      const req = {
        cookies: { refresh_token: 'token-123' },
      } as unknown as Request; // Transtypage propre

      const payload = { sub: '1', email: 'test@test.com' };

      const result = strategy.validate(req, payload);

      expect(result).toEqual({
        sub: 1,
        email: 'test@test.com',
        refreshToken: 'token-123',
      });
    });

    it('✅ devrait valider avec un token venant du header authorization', () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer token-header' },
      } as unknown as Request;

      const payload = { sub: '1', email: 'test@test.com' };

      const result = strategy.validate(req, payload);

      expect(result.refreshToken).toBe('token-header');
    });

    it('❌ devrait throw ForbiddenException si aucun token n est trouvé', () => {
      const req = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      const payload = { sub: '1', email: 'test@test.com' };

      expect(() => strategy.validate(req, payload)).toThrow(ForbiddenException);
    });
  });
});
