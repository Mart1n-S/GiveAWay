import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

// ── Helpers ────────────────────────────────────────────────────────────────

const mockProfileService = {
  checkParticipation: jest.fn(),
  participateInMission: jest.fn(),
  cancelParticipation: jest.fn(),
  // Stubs minimaux pour que le module NestJS compile
  getProfile: jest.fn(),
  getFollowedAssociations: jest.fn(),
  getParticipationStats: jest.fn(),
  updateProfile: jest.fn(),
  updateNotifications: jest.fn(),
  savePushToken: jest.fn(),
  deleteProfile: jest.fn(),
  exportData: jest.fn(),
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

const noUserRequest = (): AuthenticatedRequest =>
  createMockRequest({
    user: { id: undefined as unknown as number, email: '' },
  });

const buildModule = async (): Promise<ProfileController> => {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ProfileController],
    providers: [{ provide: ProfileService, useValue: mockProfileService }],
  })
    .overrideGuard(AuthGuard('jwt'))
    .useValue({ canActivate: () => true })
    .compile();

  jest.clearAllMocks();
  return module.get<ProfileController>(ProfileController);
};

// ===========================================================================
// checkParticipation — GET /profile/missions/:missionId/participation
// ===========================================================================

describe('ProfileController — checkParticipation', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    controller = await buildModule();
  });

  it('✅ Appelle checkParticipation(userId, missionId) et retourne le résultat', async () => {
    const req = createMockRequest();
    mockProfileService.checkParticipation.mockResolvedValue(true);

    const result = await controller.checkParticipation(req, 42);

    expect(mockProfileService.checkParticipation).toHaveBeenCalledWith(1, 42);
    expect(result).toEqual({ isParticipating: true });
  });

  it('✅ Retourne { isParticipating: false } quand le service retourne false', async () => {
    const req = createMockRequest();
    mockProfileService.checkParticipation.mockResolvedValue(false);

    const result = await controller.checkParticipation(req, 7);

    expect(result).toEqual({ isParticipating: false });
  });

  it('❌ Lève UnauthorizedException si req.user.id est undefined', async () => {
    await expect(
      controller.checkParticipation(noUserRequest(), 1),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockProfileService.checkParticipation).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// participateInMission — POST /profile/missions/:missionId/participate
// ===========================================================================

describe('ProfileController — participateInMission', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    controller = await buildModule();
  });

  it('✅ Appelle participateInMission(userId, missionId) et retourne void', async () => {
    const req = createMockRequest();
    mockProfileService.participateInMission.mockResolvedValue(undefined);

    const result = await controller.participateInMission(req, 5);

    expect(mockProfileService.participateInMission).toHaveBeenCalledWith(1, 5);
    expect(result).toBeUndefined();
  });

  it('✅ Transmet le bon userId extrait du JWT', async () => {
    const req = createMockRequest({ user: { id: 99, email: 'x@x.com' } });
    mockProfileService.participateInMission.mockResolvedValue(undefined);

    await controller.participateInMission(req, 3);

    expect(mockProfileService.participateInMission).toHaveBeenCalledWith(99, 3);
  });

  it('❌ Lève UnauthorizedException si req.user.id est undefined', async () => {
    await expect(
      controller.participateInMission(noUserRequest(), 1),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockProfileService.participateInMission).not.toHaveBeenCalled();
  });

  it('❌ Propage les erreurs levées par le service (ex: BadRequest)', async () => {
    const req = createMockRequest();
    const error = new Error("La mission n'accepte pas de candidatures.");
    mockProfileService.participateInMission.mockRejectedValue(error);

    await expect(controller.participateInMission(req, 1)).rejects.toThrow(
      error,
    );
  });
});

// ===========================================================================
// cancelParticipation — DELETE /profile/missions/:missionId/participate
// ===========================================================================

describe('ProfileController — cancelParticipation', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    controller = await buildModule();
  });

  it('✅ Appelle cancelParticipation(userId, missionId) et retourne void', async () => {
    const req = createMockRequest();
    mockProfileService.cancelParticipation.mockResolvedValue(undefined);

    const result = await controller.cancelParticipation(req, 8);

    expect(mockProfileService.cancelParticipation).toHaveBeenCalledWith(1, 8);
    expect(result).toBeUndefined();
  });

  it('✅ Transmet le bon userId extrait du JWT', async () => {
    const req = createMockRequest({ user: { id: 55, email: 'y@y.com' } });
    mockProfileService.cancelParticipation.mockResolvedValue(undefined);

    await controller.cancelParticipation(req, 12);

    expect(mockProfileService.cancelParticipation).toHaveBeenCalledWith(55, 12);
  });

  it('❌ Lève UnauthorizedException si req.user.id est undefined', async () => {
    await expect(
      controller.cancelParticipation(noUserRequest(), 1),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockProfileService.cancelParticipation).not.toHaveBeenCalled();
  });
});
