import { Test, TestingModule } from '@nestjs/testing';
import { CookieService } from './cookie.service';
import { Response } from 'express';

const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
} as unknown as Response;

describe('CookieService', () => {
  let service: CookieService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CookieService],
    }).compile();

    service = module.get<CookieService>(CookieService);
    jest.clearAllMocks();
  });

  describe('setAuthCookies', () => {
    it('✅ Doit poser access_token et refresh_token avec les bonnes options', () => {
      service.setAuthCookies(
        mockResponse,
        'my_access_token',
        'my_refresh_token',
      );

      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'my_access_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000,
        }),
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'my_refresh_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('✅ Doit poser secure=false hors production', () => {
      process.env.NODE_ENV = 'development';

      // On recrée le service pour que isProd soit recalculé
      const devService = new CookieService();
      devService.setAuthCookies(mockResponse, 'at', 'rt');

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'at',
        expect.objectContaining({ secure: false }),
      );
    });

    it('✅ Doit poser secure=true en production', () => {
      process.env.NODE_ENV = 'production';

      const prodService = new CookieService();
      prodService.setAuthCookies(mockResponse, 'at', 'rt');

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'at',
        expect.objectContaining({ secure: true }),
      );

      // Nettoyage
      process.env.NODE_ENV = 'test';
    });
  });

  describe('clearAuthCookies', () => {
    it('✅ Doit effacer access_token et refresh_token', () => {
      service.clearAuthCookies(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });
});
