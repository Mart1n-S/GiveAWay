import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

const mockMeService = { getMe: jest.fn() };

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: {},
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

describe('MeController', () => {
  let controller: MeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeController],
      providers: [{ provide: MeService, useValue: mockMeService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MeController>(MeController);
    jest.clearAllMocks();
  });

  it('✅ Devrait retourner le profil utilisateur', async () => {
    const req = createMockRequest();
    mockMeService.getMe.mockResolvedValue({ id: 1 });

    const result = await controller.getProfile(req);
    expect(result).toEqual({ id: 1 });
    expect(mockMeService.getMe).toHaveBeenCalledWith(1);
  });

  it("❌ Devrait lever une erreur si l'id utilisateur est manquant", async () => {
    const req = createMockRequest({
      user: { id: undefined as any, email: '' },
    });
    await expect(controller.getProfile(req)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
