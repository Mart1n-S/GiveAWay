import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import {
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
} from './profile-test.helpers';

const makeParticipation = (overrides: Record<string, unknown> = {}) => {
  const { mission: missionOverrides, ...rest } = overrides;
  return {
    missionId: 1,
    userId: 1,
    createdAt: new Date('2025-03-10'),
    mission: {
      id: 1,
      title: 'Mission test',
      type: 'MISSION',
      availabilityType: 'ON_SITE',
      startDate: new Date('2025-03-01'),
      durationInt: 120,
      associationId: 10,
      association: { id: 10, name: 'Asso A' },
      causes: [{ cause: { id: 1, label: 'Écologie' } }],
      ...((missionOverrides as object) ?? {}),
    },
    ...rest,
  };
};

describe('ProfileService — getParticipationStats', () => {
  let service: ProfileService;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(async () => {
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
  });

  it('✅ Retourne des stats vides si aucune participation', async () => {
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue([]);

    const result = await service.getParticipationStats(1, {});

    expect(result.summary.totalParticipations).toBe(0);
    expect(result.summary.distinctAssociations).toBe(0);
    expect(result.summary.totalHours).toBeNull();
    expect(result.summary.mostFrequentType).toBeNull();
    expect(result.byType).toHaveLength(0);
    expect(result.byMonth).toHaveLength(0);
    expect(result.byAssociation).toHaveLength(0);
    expect(result.participations).toHaveLength(0);
  });

  it('✅ Passe le filtre par type à Prisma', async () => {
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue([]);

    await service.getParticipationStats(1, { type: 'EVENT' });

    expect(
      mockAuthService.prisma.missionParticipant.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mission: expect.objectContaining({ type: 'EVENT' }),
        }),
      }),
    );
  });

  it('✅ Passe le filtre par plage de dates à Prisma', async () => {
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue([]);

    await service.getParticipationStats(1, {
      startDate: '2025-01-01',
      endDate: '2025-06-30',
    });

    expect(
      mockAuthService.prisma.missionParticipant.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mission: expect.objectContaining({
            startDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      }),
    );
  });

  it('✅ totalHours est null quand tous les durationInt sont null', async () => {
    const rows = [
      makeParticipation({ mission: { durationInt: null } }),
      makeParticipation({ mission: { durationInt: null } }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.summary.totalHours).toBeNull();
  });

  it('✅ Calcule totalHours correctement', async () => {
    const rows = [
      makeParticipation({ mission: { durationInt: 90 } }),
      makeParticipation({ mission: { durationInt: 30 } }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.summary.totalHours).toBe(2);
    expect(result.summary.totalParticipations).toBe(2);
  });

  // ─── mostFrequentType ──────────────────────────────────────────────────────

  it('✅ mostFrequentType est le type le plus fréquent', async () => {
    const rows = [
      makeParticipation({ mission: { type: 'MISSION' } }),
      makeParticipation({ mission: { type: 'MISSION' } }),
      makeParticipation({ mission: { type: 'EVENT' } }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.summary.mostFrequentType).toBe('MISSION');
  });

  it('✅ mostFrequentType est null si aucune participation', async () => {
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue([]);

    const result = await service.getParticipationStats(1, {});

    expect(result.summary.mostFrequentType).toBeNull();
  });

  // ─── byType ────────────────────────────────────────────────────────────────

  it('✅ byType contient les types avec le bon count', async () => {
    const rows = [
      makeParticipation({ mission: { type: 'MISSION' } }),
      makeParticipation({ mission: { type: 'MISSION' } }),
      makeParticipation({ mission: { type: 'EVENT' } }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    const missionEntry = result.byType.find((b) => b.type === 'MISSION');
    const eventEntry = result.byType.find((b) => b.type === 'EVENT');
    expect(missionEntry?.count).toBe(2);
    expect(eventEntry?.count).toBe(1);
  });

  it('✅ byType est trié par count décroissant', async () => {
    const rows = [
      makeParticipation({ mission: { type: 'EVENT' } }),
      makeParticipation({ mission: { type: 'MISSION' } }),
      makeParticipation({ mission: { type: 'MISSION' } }),
      makeParticipation({ mission: { type: 'COLLECT' } }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    const counts = result.byType.map((b) => b.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  // ─── byAssociation ─────────────────────────────────────────────────────────

  it('✅ byAssociation contient le bon associationId, name et count', async () => {
    const rows = [
      makeParticipation({
        mission: { associationId: 10, association: { id: 10, name: 'Asso A' } },
      }),
      makeParticipation({
        mission: { associationId: 20, association: { id: 20, name: 'Asso B' } },
      }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    const assoA = result.byAssociation.find((a) => a.associationId === 10);
    const assoB = result.byAssociation.find((a) => a.associationId === 20);
    expect(assoA).toEqual({ associationId: 10, name: 'Asso A', count: 1 });
    expect(assoB).toEqual({ associationId: 20, name: 'Asso B', count: 1 });
  });

  it('✅ byAssociation est trié par count décroissant', async () => {
    const rows = [
      makeParticipation({
        mission: { associationId: 20, association: { id: 20, name: 'Asso B' } },
      }),
      makeParticipation({
        mission: { associationId: 10, association: { id: 10, name: 'Asso A' } },
      }),
      makeParticipation({
        mission: { associationId: 10, association: { id: 10, name: 'Asso A' } },
      }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.byAssociation[0].associationId).toBe(10);
    expect(result.byAssociation[0].count).toBe(2);
    expect(result.byAssociation[1].associationId).toBe(20);
    expect(result.byAssociation[1].count).toBe(1);
  });

  // ─── participations list ───────────────────────────────────────────────────

  it('✅ Chaque participation a les bons champs', async () => {
    const startDate = new Date('2025-03-01');
    const createdAt = new Date('2025-03-10');
    const rows = [
      {
        missionId: 42,
        userId: 1,
        createdAt,
        mission: {
          id: 42,
          title: 'Ma mission',
          type: 'EVENT',
          availabilityType: 'REMOTE',
          startDate,
          durationInt: 60,
          associationId: 10,
          association: { id: 10, name: 'Asso A' },
          causes: [{ cause: { id: 3, label: 'Éducation' } }],
        },
      },
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.participations).toHaveLength(1);
    const p = result.participations[0];
    expect(p.missionId).toBe(42);
    expect(p.createdAt).toBe(createdAt.toISOString());
    expect(p.mission.id).toBe(42);
    expect(p.mission.title).toBe('Ma mission');
    expect(p.mission.type).toBe('EVENT');
    expect(p.mission.availabilityType).toBe('REMOTE');
    expect(p.mission.startDate).toBe(startDate.toISOString());
    expect(p.mission.durationInt).toBe(60);
    expect(p.mission.causes).toEqual([{ id: 3, label: 'Éducation' }]);
    expect(p.mission.association).toEqual({ id: 10, name: 'Asso A' });
  });

  it('✅ mission.startDate est null si startDate est null sur la mission', async () => {
    const rows = [makeParticipation({ mission: { startDate: null } })];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.participations[0].mission.startDate).toBeNull();
  });

  // ─── byMonth ───────────────────────────────────────────────────────────────

  it('✅ byMonth groupe par mois correctement', async () => {
    const rows = [
      makeParticipation({ mission: { startDate: new Date('2025-03-05') } }),
      makeParticipation({ mission: { startDate: new Date('2025-03-15') } }),
      makeParticipation({ mission: { startDate: new Date('2025-03-25') } }),
    ];
    mockAuthService.prisma.missionParticipant.findMany.mockResolvedValue(rows);

    const result = await service.getParticipationStats(1, {});

    expect(result.byMonth).toHaveLength(1);
    expect(result.byMonth[0].month).toBe('2025-03');
    expect(result.byMonth[0].count).toBe(3);
  });
});
