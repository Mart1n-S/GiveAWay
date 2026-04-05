import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { mockMappedUser } from './profile-test.helpers';

const mockProfileService = {
  updateNotifications: jest.fn(),
};

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: {},
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('ProfileController — updateNotifications', () => {
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

  it('✅ Doit appeler updateNotifications avec le bon userId et le bon dto', async () => {
    const req = createMockRequest();
    const dto = { emailNotifications: true };
    mockProfileService.updateNotifications.mockResolvedValue({
      ...mockMappedUser,
      emailNotifications: true,
    });

    const result = await controller.updateNotifications(req, dto);

    expect(mockProfileService.updateNotifications).toHaveBeenCalledWith(1, dto);
    expect(result).toHaveProperty('emailNotifications', true);
  });

  it('✅ Doit retourner le profil mis à jour avec emailNotifications=false', async () => {
    const req = createMockRequest();
    const dto = { emailNotifications: false };
    mockProfileService.updateNotifications.mockResolvedValue({
      ...mockMappedUser,
      emailNotifications: false,
    });

    const result = await controller.updateNotifications(req, dto);

    expect(result).toHaveProperty('emailNotifications', false);
  });

  it('❌ Doit lever UnauthorizedException si req.user.id est absent', async () => {
    const req = createMockRequest({
      user: { id: undefined as unknown as number, email: '' },
    });
    const dto = { emailNotifications: true };

    await expect(controller.updateNotifications(req, dto)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockProfileService.updateNotifications).not.toHaveBeenCalled();
  });

  it('✅ Doit propager les erreurs lancées par le service', async () => {
    const req = createMockRequest();
    const dto = { emailNotifications: true };
    mockProfileService.updateNotifications.mockRejectedValue(
      new Error('DB error'),
    );

    await expect(controller.updateNotifications(req, dto)).rejects.toThrow(
      'DB error',
    );
  });
});
