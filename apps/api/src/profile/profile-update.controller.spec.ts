import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

const mockProfileService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
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

describe('ProfileController — updateProfile', () => {
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

  it('✅ Doit appeler updateProfile avec les bons paramètres', async () => {
    const req = createMockRequest();
    const dto = { firstName: 'Jean', biography: 'Nouvelle bio' };
    mockProfileService.updateProfile.mockResolvedValue({
      id: 1,
      firstName: 'Jean',
    });

    const result = await controller.updateProfile(req, dto, undefined);

    expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
      1,
      dto,
      undefined,
    );
    expect(result).toHaveProperty('firstName', 'Jean');
  });

  it('✅ Doit passer le fichier image si fourni', async () => {
    const req = createMockRequest();
    const dto = {};
    const mockFile = { buffer: Buffer.from('img') } as Express.Multer.File;
    mockProfileService.updateProfile.mockResolvedValue({ id: 1 });

    await controller.updateProfile(req, dto, mockFile);

    expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
      1,
      dto,
      mockFile,
    );
  });

  it('✅ Doit fonctionner sans fichier ni données', async () => {
    const req = createMockRequest();
    mockProfileService.updateProfile.mockResolvedValue({ id: 1 });

    await controller.updateProfile(req, {}, undefined);

    expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
      1,
      {},
      undefined,
    );
  });

  it('❌ Doit lever UnauthorizedException si id manquant', async () => {
    const req = createMockRequest({
      user: { id: undefined as unknown as number, email: '' },
    });

    await expect(controller.updateProfile(req, {}, undefined)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
