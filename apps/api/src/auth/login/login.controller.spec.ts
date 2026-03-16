import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { GuestGuard } from '../guards/guest.guard';
import { LoginController } from './login.controller';
import { LoginService } from './login.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

const mockLoginService = { login: jest.fn() };

const mockResponse = {
  cookie: jest.fn(),
} as unknown as Response;

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: { 'user-agent': 'Mozilla' },
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('LoginController', () => {
  let controller: LoginController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginController],
      providers: [{ provide: LoginService, useValue: mockLoginService }],
    })
      .overrideGuard(GuestGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LoginController>(LoginController);
    jest.clearAllMocks();
  });

  it('✅ Devrait connecter un utilisateur et définir les cookies (web)', async () => {
    const req = createMockRequest();
    mockLoginService.login.mockResolvedValue({
      message: 'Connexion réussie',
      user: { id: 1 },
    });

    const result = await controller.login(
      { email: 'test@test.com', password: 'pass' },
      mockResponse,
      req,
      '127.0.0.1',
    );

    expect(mockLoginService.login).toHaveBeenCalledWith(
      { email: 'test@test.com', password: 'pass' },
      mockResponse,
      'Mozilla',
      '127.0.0.1',
      undefined,
    );
    expect(result).toEqual({ message: 'Connexion réussie', user: { id: 1 } });
  });

  it('✅ Devrait passer "Unknown" si user-agent absent', async () => {
    const req = createMockRequest({ headers: {} });
    mockLoginService.login.mockResolvedValue({});

    await controller.login(
      { email: 'test@test.com', password: 'pass' },
      mockResponse,
      req,
      '127.0.0.1',
      'mobile',
    );

    expect(mockLoginService.login).toHaveBeenCalledWith(
      expect.anything(),
      mockResponse,
      'Unknown',
      '127.0.0.1',
      'mobile',
    );
  });
});
