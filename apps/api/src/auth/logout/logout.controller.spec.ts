import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { LogoutController } from './logout.controller';
import { LogoutService } from './logout.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

const mockLogoutService = { logout: jest.fn() };

const mockResponse = {
  clearCookie: jest.fn(),
} as unknown as Response;

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: {},
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('LogoutController', () => {
  let controller: LogoutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogoutController],
      providers: [{ provide: LogoutService, useValue: mockLogoutService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LogoutController>(LogoutController);
    jest.clearAllMocks();
  });

  it('✅ Devrait déconnecter un utilisateur et effacer les cookies', async () => {
    const req = createMockRequest({ cookies: { refresh_token: 'token' } });

    const result = await controller.logout(req, mockResponse, {});

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(mockLogoutService.logout).toHaveBeenCalledWith(1, 'token');
    expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
    expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
    expect(result).toEqual({ message: 'Déconnecté avec succès' });
  });

  it('✅ Devrait accepter le refreshToken depuis le body si absent du cookie', async () => {
    const req = createMockRequest({ cookies: {} });

    await controller.logout(req, mockResponse, { refreshToken: 'body-token' });

    expect(mockLogoutService.logout).toHaveBeenCalledWith(1, 'body-token');
  });
});
