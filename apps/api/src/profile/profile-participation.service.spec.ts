import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import {
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
} from './profile-test.helpers';

// ── Helpers ────────────────────────────────────────────────────────────────

const makeMission = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  status: 'ACTIVE',
  hasRegistration: true,
  ...overrides,
});

// ── Setup ──────────────────────────────────────────────────────────────────

let service: ProfileService;
let mockAuthService: ReturnType<typeof createMockAuthService>;

const buildModule = async () => {
  mockAuthService = createMockAuthService();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ProfileService,
      { provide: AuthService, useValue: mockAuthService },
      { provide: FILE_SERVICE, useValue: createMockFileService() },
      { provide: CookieService, useValue: createMockCookieService() },
    ],
  }).compile();

  service = module.get<ProfileService>(ProfileService);
  jest.clearAllMocks();
};

// ===========================================================================
// checkParticipation
// ===========================================================================

describe('ProfileService — checkParticipation', () => {
  beforeEach(buildModule);

  it('✅ Retourne true si une participation existe', async () => {
    mockAuthService.prisma.missionParticipant.findFirst.mockResolvedValue({
      missionId: 5,
    });

    const result = await service.checkParticipation(1, 5);

    expect(result).toBe(true);
  });

  it('✅ Retourne false si aucune participation', async () => {
    mockAuthService.prisma.missionParticipant.findFirst.mockResolvedValue(null);

    const result = await service.checkParticipation(1, 5);

    expect(result).toBe(false);
  });

  it('✅ Passe le bon userId et missionId à Prisma', async () => {
    mockAuthService.prisma.missionParticipant.findFirst.mockResolvedValue(null);

    await service.checkParticipation(42, 99);

    expect(
      mockAuthService.prisma.missionParticipant.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 42, missionId: 99 },
      }),
    );
  });
});

// ===========================================================================
// participateInMission
// ===========================================================================

describe('ProfileService — participateInMission', () => {
  beforeEach(buildModule);

  it('✅ Crée la participation via upsert si la mission est ACTIVE avec inscription', async () => {
    mockAuthService.prisma.mission.findUnique.mockResolvedValue(makeMission());
    mockAuthService.prisma.missionParticipant.upsert.mockResolvedValue({});

    await service.participateInMission(1, 1);

    expect(
      mockAuthService.prisma.missionParticipant.upsert,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockAuthService.prisma.missionParticipant.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { missionId_userId: { missionId: 1, userId: 1 } },
        create: { userId: 1, missionId: 1 },
      }),
    );
  });

  it('❌ Lève BadRequestException si la mission est introuvable', async () => {
    mockAuthService.prisma.mission.findUnique.mockResolvedValue(null);

    await expect(service.participateInMission(1, 999)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      mockAuthService.prisma.missionParticipant.upsert,
    ).not.toHaveBeenCalled();
  });

  it('❌ Lève BadRequestException si la mission est ARCHIVED', async () => {
    mockAuthService.prisma.mission.findUnique.mockResolvedValue(
      makeMission({ status: 'ARCHIVED' }),
    );

    await expect(service.participateInMission(1, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('❌ Lève BadRequestException si la mission est DELETED', async () => {
    mockAuthService.prisma.mission.findUnique.mockResolvedValue(
      makeMission({ status: 'DELETED' }),
    );

    await expect(service.participateInMission(1, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('❌ Lève BadRequestException si hasRegistration est false', async () => {
    mockAuthService.prisma.mission.findUnique.mockResolvedValue(
      makeMission({ hasRegistration: false }),
    );

    await expect(service.participateInMission(1, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      mockAuthService.prisma.missionParticipant.upsert,
    ).not.toHaveBeenCalled();
  });

  it('✅ Passe le bon userId au moment de créer', async () => {
    mockAuthService.prisma.mission.findUnique.mockResolvedValue(makeMission());
    mockAuthService.prisma.missionParticipant.upsert.mockResolvedValue({});

    await service.participateInMission(42, 7);

    expect(
      mockAuthService.prisma.missionParticipant.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 42, missionId: 7 },
      }),
    );
  });
});

// ===========================================================================
// cancelParticipation
// ===========================================================================

describe('ProfileService — cancelParticipation', () => {
  beforeEach(buildModule);

  it('✅ Appelle deleteMany avec le bon userId et missionId', async () => {
    mockAuthService.prisma.missionParticipant.deleteMany.mockResolvedValue({
      count: 1,
    });

    await service.cancelParticipation(1, 5);

    expect(
      mockAuthService.prisma.missionParticipant.deleteMany,
    ).toHaveBeenCalledWith({
      where: { userId: 1, missionId: 5 },
    });
  });

  it("✅ Ne lève pas d'erreur si aucune participation à supprimer (count=0)", async () => {
    mockAuthService.prisma.missionParticipant.deleteMany.mockResolvedValue({
      count: 0,
    });

    await expect(service.cancelParticipation(1, 999)).resolves.not.toThrow();
  });

  it('✅ Passe les bons ids à deleteMany pour différents utilisateurs', async () => {
    mockAuthService.prisma.missionParticipant.deleteMany.mockResolvedValue({
      count: 1,
    });

    await service.cancelParticipation(77, 88);

    expect(
      mockAuthService.prisma.missionParticipant.deleteMany,
    ).toHaveBeenCalledWith({
      where: { userId: 77, missionId: 88 },
    });
  });
});
