import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

const mockProfileService = {
  getFollowedAssociations: jest.fn(),
  getParticipationStats: jest.fn(),
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

describe('ProfileController — getFollowedAssociations', () => {
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

  it('✅ Appelle getFollowedAssociations(1) et retourne le résultat', async () => {
    const req = createMockRequest();
    const mockResult = [
      { id: 42, name: 'Les Restos du Cœur', logoUrl: null, city: 'Lyon' },
    ];
    mockProfileService.getFollowedAssociations.mockResolvedValue(mockResult);

    const result = await controller.getFollowedAssociations(req);

    expect(mockProfileService.getFollowedAssociations).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockResult);
  });

  it('❌ Lève UnauthorizedException si req.user.id est undefined', async () => {
    const req = createMockRequest({
      user: { id: undefined as unknown as number, email: '' },
    });

    await expect(controller.getFollowedAssociations(req)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockProfileService.getFollowedAssociations).not.toHaveBeenCalled();
  });
});

describe('ProfileController — getParticipationStats', () => {
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

  it('✅ Appelle getParticipationStats(1, query) et retourne le résultat', async () => {
    const req = createMockRequest();
    const query = { type: 'EVENT' };
    const mockResult = {
      participations: [],
      summary: {
        totalParticipations: 0,
        distinctAssociations: 0,
        totalHours: null,
        mostFrequentType: null,
      },
      byType: [],
      byMonth: [],
      byAssociation: [],
    };
    mockProfileService.getParticipationStats.mockResolvedValue(mockResult);

    const result = await controller.getParticipationStats(req, query as any);

    expect(mockProfileService.getParticipationStats).toHaveBeenCalledWith(
      1,
      query,
    );
    expect(result).toEqual(mockResult);
  });

  it('❌ Lève UnauthorizedException si req.user.id est undefined', async () => {
    const req = createMockRequest({
      user: { id: undefined as unknown as number, email: '' },
    });
    const query = {};

    await expect(
      controller.getParticipationStats(req, query as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockProfileService.getParticipationStats).not.toHaveBeenCalled();
  });
});
