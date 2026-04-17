import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

const mockProfileService = { getProfile: jest.fn() };

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: {},
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('ProfileController', () => {
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

  describe('getProfile', () => {
    it('✅ Doit retourner le profil complet', async () => {
      const req = createMockRequest();
      mockProfileService.getProfile.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        skills: [],
        causes: [],
        availability: null,
        participations: [],
      });

      const result = await controller.getProfile(req);

      expect(mockProfileService.getProfile).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty('email', 'test@test.com');
    });

    it('❌ Doit lever UnauthorizedException si id manquant', async () => {
      const req = createMockRequest({
        user: { id: undefined as unknown as number, email: '' },
      });

      await expect(controller.getProfile(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
