import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

const mockProfileService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
};

const mockResponse = {} as Response;

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: {},
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('ProfileController — deleteProfile', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfileController>(ProfileController);
    jest.clearAllMocks();
  });

  it('✅ Doit appeler deleteProfile avec les bons paramètres (mot de passe)', async () => {
    const req = createMockRequest();
    mockProfileService.deleteProfile.mockResolvedValue(undefined);

    await controller.deleteProfile(req, mockResponse, {
      password: 'correct_password',
    });

    expect(mockProfileService.deleteProfile).toHaveBeenCalledWith(
      1,
      { password: 'correct_password' },
      mockResponse,
    );
  });

  it('✅ Doit appeler deleteProfile avec les bons paramètres (confirmation Google)', async () => {
    const req = createMockRequest();
    mockProfileService.deleteProfile.mockResolvedValue(undefined);

    await controller.deleteProfile(req, mockResponse, {
      confirmation: 'SUPPRIMER',
    });

    expect(mockProfileService.deleteProfile).toHaveBeenCalledWith(
      1,
      { confirmation: 'SUPPRIMER' },
      mockResponse,
    );
  });

  it('✅ Doit retourner void (204 No Content)', async () => {
    const req = createMockRequest();
    mockProfileService.deleteProfile.mockResolvedValue(undefined);

    const result = await controller.deleteProfile(req, mockResponse, {
      password: 'correct_password',
    });

    expect(result).toBeUndefined();
  });

  it('❌ Doit lever UnauthorizedException si id manquant', async () => {
    const req = createMockRequest({
      user: { id: undefined as unknown as number, email: '' },
    });

    await expect(
      controller.deleteProfile(req, mockResponse, { password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
