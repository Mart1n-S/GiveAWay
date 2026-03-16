import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { CookieService } from '../shared/cookie.service';
import { GuestGuard } from '../guards/guest.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

const mockPasswordService = {
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
};
const mockCookieService = { clearAuthCookies: jest.fn() };

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

describe('PasswordController', () => {
  let controller: PasswordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasswordController],
      providers: [
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    })
      .overrideGuard(GuestGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PasswordController>(PasswordController);
    jest.clearAllMocks();
  });

  it('✅ Devrait appeler forgotPassword', async () => {
    mockPasswordService.forgotPassword.mockResolvedValue({ message: 'ok' });

    await controller.forgotPassword({ email: 'test@test.com' });

    expect(mockPasswordService.forgotPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
    });
  });

  it('✅ Devrait réinitialiser le mot de passe', async () => {
    const dto = { code: '123456', password: 'new', confirmPassword: 'new' };
    mockPasswordService.resetPassword.mockResolvedValue({ message: 'ok' });

    await controller.resetPassword(dto);

    expect(mockPasswordService.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('✅ Devrait changer le mot de passe et effacer les cookies', async () => {
    const req = createMockRequest();
    mockPasswordService.changePassword.mockResolvedValue({
      message: 'Mot de passe modifié',
    });

    const result = await controller.changePassword(
      req,
      { oldPassword: 'old', newPassword: 'new', confirmPassword: 'new' },
      mockResponse,
    );

    expect(mockPasswordService.changePassword).toHaveBeenCalledWith(1, {
      oldPassword: 'old',
      newPassword: 'new',
      confirmPassword: 'new',
    });
    expect(mockCookieService.clearAuthCookies).toHaveBeenCalledWith(
      mockResponse,
    );
    expect(result.message).toBeDefined();
  });
});
