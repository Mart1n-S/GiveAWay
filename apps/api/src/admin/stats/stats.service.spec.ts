import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  association: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  mission: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  missionParticipant: { count: jest.fn(), groupBy: jest.fn() },
  associationUser: { groupBy: jest.fn() },
  associationCategory: { findMany: jest.fn() },
  cause: { findMany: jest.fn() },
  skill: { findMany: jest.fn() },
  userCause: { groupBy: jest.fn() },
  userSkill: { groupBy: jest.fn() },
  adminLog: { findMany: jest.fn(), count: jest.fn() },
  $queryRawUnsafe: jest.fn(),
};

describe('AdminStatsService', () => {
  let service: AdminStatsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(AdminStatsService);
  });

  describe('overview', () => {
    it('agrège des KPI en parallèle et calcule un taux de validation', async () => {
      // 15 valeurs séquentielles pour les 15 count() en parallèle
      const seq = [10, 5, 3, 7, 6, 2, 1, 4, 4, 8, 6, 3, 1, 2, 0];
      mockPrisma.user.count
        .mockResolvedValueOnce(seq[0])
        .mockResolvedValueOnce(seq[1])
        .mockResolvedValueOnce(seq[2]);
      mockPrisma.association.count
        .mockResolvedValueOnce(seq[3])
        .mockResolvedValueOnce(seq[4])
        .mockResolvedValueOnce(seq[5])
        .mockResolvedValueOnce(seq[6])
        .mockResolvedValueOnce(seq[11])
        .mockResolvedValueOnce(seq[12])
        .mockResolvedValueOnce(seq[13])
        .mockResolvedValueOnce(seq[14]);
      mockPrisma.mission.count
        .mockResolvedValueOnce(seq[7])
        .mockResolvedValueOnce(seq[8]);
      mockPrisma.missionParticipant.count
        .mockResolvedValueOnce(seq[9])
        .mockResolvedValueOnce(seq[10]);

      const res = await service.overview();
      expect(res.range.from).toBeDefined();
      expect(res.range.to).toBeDefined();
      expect(res.activeUsers.value).toBe(10);
      // ratePrev=ratio(2,0)=100, rate=ratio(3,1)=75 → delta = -25, deltaPct = -25
      expect(res.associationValidationRate.value).toBeCloseTo(75);
    });

    it('retourne une plage de 30 jours par défaut', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.association.count.mockResolvedValue(0);
      mockPrisma.mission.count.mockResolvedValue(0);
      mockPrisma.missionParticipant.count.mockResolvedValue(0);
      const res = await service.overview();
      const span =
        new Date(res.range.to).getTime() - new Date(res.range.from).getTime();
      const days = span / (1000 * 60 * 60 * 24);
      expect(days).toBeCloseTo(30, 0);
    });
  });

  describe('timeseries', () => {
    it('exécute un $queryRawUnsafe et mappe le résultat', async () => {
      const date = new Date('2026-04-01T00:00:00Z');
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { bucket: date, count: BigInt(7) },
      ]);
      const res = await service.timeseries({
        metric: 'user_signups',
        granularity: 'day',
      });
      expect(res).toEqual([{ bucket: date.toISOString(), count: 7 }]);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });

  describe('breakdown', () => {
    it('mission_type → groupBy mission.type', async () => {
      mockPrisma.mission.groupBy.mockResolvedValue([
        { type: 'MISSION', _count: { _all: 3 } },
      ]);
      const res = await service.breakdown({
        dimension: 'mission_type',
        limit: 10,
      });
      expect(mockPrisma.mission.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['type'] }),
      );
      expect(res).toEqual([{ type: 'MISSION', _count: { _all: 3 } }]);
    });

    it('top_causes → mappe avec labels des causes', async () => {
      mockPrisma.userCause.groupBy.mockResolvedValue([
        { causeId: 1, _count: { _all: 5 } },
        { causeId: 2, _count: { _all: 2 } },
      ]);
      mockPrisma.cause.findMany.mockResolvedValue([
        { id: 1, label: 'C1' },
        { id: 2, label: 'C2' },
      ]);
      const res = await service.breakdown({
        dimension: 'top_causes',
        limit: 5,
      });
      expect(res).toEqual([
        { causeId: 1, label: 'C1', count: 5 },
        { causeId: 2, label: 'C2', count: 2 },
      ]);
    });

    it('association_category → "Sans catégorie" si null', async () => {
      mockPrisma.association.groupBy.mockResolvedValue([
        { categoryId: null, _count: { _all: 4 } },
      ]);
      mockPrisma.associationCategory.findMany.mockResolvedValue([]);
      const res = (await service.breakdown({
        dimension: 'association_category',
        limit: 10,
      })) as { name: string }[];
      expect(res[0].name).toBe('Sans catégorie');
    });
  });

  describe('top', () => {
    it('recent_users → liste les users récents', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 1 }]);
      const res = await service.top({ entity: 'recent_users', limit: 5 });
      expect(res).toEqual([{ id: 1 }]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: 5 }),
      );
    });

    it('associations_by_volunteers → enrichit avec name', async () => {
      mockPrisma.associationUser.groupBy.mockResolvedValue([
        { associationId: 1, _count: { _all: 4 } },
      ]);
      mockPrisma.association.findMany.mockResolvedValue([{ id: 1, name: 'A' }]);
      const res = await service.top({
        entity: 'associations_by_volunteers',
        limit: 5,
      });
      expect(res).toEqual([{ associationId: 1, name: 'A', volunteers: 4 }]);
    });
  });

  describe('adminLogs', () => {
    it('applique filtres action / from-to + paginates', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.adminLog.count.mockResolvedValue(1);
      const res = await service.adminLogs({
        action: 'CREATE_ADMIN',
        from: '2026-01-01',
        to: '2026-04-01',
        page: 2,
        limit: 50,
      });
      expect(res.total).toBe(1);
      const arg = mockPrisma.adminLog.findMany.mock.calls[0][0] as Record<
        string,
        unknown
      > & {
        where: Record<string, unknown>;
      };
      expect(arg.where.action).toBe('CREATE_ADMIN');
      expect(arg.skip).toBe(50);
      expect(arg.take).toBe(50);
    });
  });

  describe('exportCsv', () => {
    it('retourne chaîne vide si aucune ligne', () => {
      const res = service.exportCsv([]);
      expect(res).toBe('');
    });

    it('échappe les valeurs contenant virgule / guillemets / saut de ligne', () => {
      const csv = service.exportCsv([
        { a: 'plain', b: 'has,comma' },
        { a: 'quote"inside', b: 'multi\nline' },
      ]);
      // header
      expect(csv.startsWith('a,b\n')).toBe(true);
      // virgule échappée par double quote
      expect(csv).toContain('plain,"has,comma"');
      // double-quote interne doublée + saut de ligne préservé dans le champ
      expect(csv).toContain('"quote""inside","multi\nline"');
    });

    it('sérialise les objets en JSON (et les échappe car contiennent des guillemets)', () => {
      const csv = service.exportCsv([{ a: { foo: 1 } }]);
      expect(csv).toContain('"{""foo"":1}"');
    });
  });
});
