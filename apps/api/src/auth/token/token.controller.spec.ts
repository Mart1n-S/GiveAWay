import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';
import { CookieService } from '../shared/cookie.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

const mockTokenService = { refreshTokens: jest.fn() };
const mockCookieService = { setAuthCookies: jest.fn() };

const mockResponse = {
  cookie: jest.fn(),
} as unknown as Response;

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: { 'user-agent': 'Mozilla' },
    cookies: {},
    user: { sub: 1, refreshToken: 'old-rt' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('TokenController', () => {
  let controller: TokenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenController],
      providers: [
        { provide: TokenService, useValue: mockTokenService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    })
      .overrideGuard(AuthGuard('jwt-refresh'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TokenController>(TokenController);
    jest.clearAllMocks();
  });

  it('✅ Devrait rafraîchir les tokens (web) et poser les cookies', async () => {
    const req = createMockRequest();
    mockTokenService.refreshTokens.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const result = await controller.refreshTokens(
      req,
      mockResponse,
      '127.0.0.1',
    );

    expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
      mockResponse,
      'at',
      'rt',
    );
    expect(result).toEqual({ message: 'Session rafraîchie' });
    expect(result).not.toHaveProperty('backendTokens');
  });

  it('✅ Devrait inclure backendTokens pour un client mobile', async () => {
    const req = createMockRequest();
    mockTokenService.refreshTokens.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const result = await controller.refreshTokens(
      req,
      mockResponse,
      '127.0.0.1',
      'mobile',
    );

    expect(result.backendTokens).toBeDefined();
    expect(result.backendTokens?.accessToken).toBe('at');
  });
});
