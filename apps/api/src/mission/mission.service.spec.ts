import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MissionService } from './mission.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { MissionListQueryDto } from '@repo/shared';

// ── Helpers ────────────────────────────────────────────────────────

/** Query par défaut (simule la sortie Zod avec defaults) */
const defaultQuery: MissionListQueryDto = { page: 1, pageSize: 12 };

/** Mission brute telle que retournée par Prisma (avec pivots imbriqués) */
const makePrismaMission = (overrides: Partial<any> = {}) => ({
  id: 1,
  title: 'Distribution de repas chauds',
  description: 'Chaque mardi soir, distribution de repas.',
  type: 'MISSION',
  hasRegistration: true,
  volunteersNeeded: 8,
  durationInt: 180,
  frequency: 'WEEKLY',
  startDate: new Date('2026-05-01'),
  endDate: null,
  association: { id: 1, name: 'Les Restos du Cœur Aix', logoUrl: null },
  address: {
    id: 1,
    street: '55 Avenue Sainte-Victoire',
    postalCode: '13100',
    city: 'Aix-en-Provence',
    latitude: 43.5325,
    longitude: 5.4578,
  },
  causes: [{ cause: { id: 1, label: 'Distribution' } }],
  skills: [{ skill: { id: 1, label: 'Cuisine' } }],
  volunteerTypes: [{ volunteerType: { id: 1, label: 'Majeurs uniquement' } }],
  ...overrides,
});

/** Mission brute pour findForMap (champs minimaux) */
const makePrismaMapMission = (overrides: Partial<any> = {}) => ({
  id: 1,
  title: 'Distribution de repas chauds',
  description: 'Chaque mardi soir, distribution de repas.',
  type: 'MISSION',
  address: {
    city: 'Aix-en-Provence',
    latitude: '43.5325000',
    longitude: '5.4578000',
  },
  association: { name: 'Les Restos du Cœur Aix', logoUrl: null },
  ...overrides,
});

/** Mission brute pour findById (avec _count et publicTypes) */
const makePrismaDetailMission = (overrides: Partial<any> = {}) => ({
  ...makePrismaMission(),
  status: 'ACTIVE',
  publicTypes: [{ publicType: { id: 1, label: 'Personnes en difficulté' } }],
  _count: { participants: 5 },
  ...overrides,
});

const mockPrismaService = {
  mission: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockMatchingService = {
  scoreUserMission: jest.fn(),
};

describe('MissionService', () => {
  let service: MissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MatchingService, useValue: mockMatchingService },
      ],
    }).compile();

    service = module.get<MissionService>(MissionService);
    jest.clearAllMocks();
  });

  // =========================================================================
  // findAll — Cas de base
  // =========================================================================
  describe('findAll — cas de base', () => {
    it('✅ Doit retourner la liste paginée avec les valeurs par défaut (page 1, pageSize 12)', async () => {
      const missions = [makePrismaMission()];
      mockPrismaService.mission.findMany.mockResolvedValue(missions);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.findAll(defaultQuery);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(12);
      expect(result.total).toBe(1);
      expect(result.missions).toHaveLength(1);
    });

    it('✅ Doit toujours filtrer sur status ACTIVE', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('ACTIVE');
    });

    it('✅ Doit retourner un résultat vide si aucune mission', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.findAll(defaultQuery);

      expect(result.missions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('✅ Doit trier par createdAt desc', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const orderBy =
        mockPrismaService.mission.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // =========================================================================
  // findAll — Aplatissement des relations pivot
  // =========================================================================
  describe('findAll — mapping des données', () => {
    it('✅ Doit aplatir les causes depuis les pivots', async () => {
      const mission = makePrismaMission({
        causes: [
          { cause: { id: 1, label: 'Distribution' } },
          { cause: { id: 2, label: 'Maraude' } },
        ],
      });
      mockPrismaService.mission.findMany.mockResolvedValue([mission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.findAll(defaultQuery);

      expect(result.missions[0].causes).toEqual([
        { id: 1, label: 'Distribution' },
        { id: 2, label: 'Maraude' },
      ]);
    });

    it('✅ Doit aplatir les skills depuis les pivots', async () => {
      const mission = makePrismaMission({
        skills: [
          { skill: { id: 1, label: 'Cuisine' } },
          { skill: { id: 2, label: 'Logistique' } },
        ],
      });
      mockPrismaService.mission.findMany.mockResolvedValue([mission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.findAll(defaultQuery);

      expect(result.missions[0].skills).toEqual([
        { id: 1, label: 'Cuisine' },
        { id: 2, label: 'Logistique' },
      ]);
    });

    it('✅ Doit aplatir les volunteerTypes depuis les pivots', async () => {
      const mission = makePrismaMission({
        volunteerTypes: [{ volunteerType: { id: 1, label: 'Ouvert à tous' } }],
      });
      mockPrismaService.mission.findMany.mockResolvedValue([mission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.findAll(defaultQuery);

      expect(result.missions[0].volunteerTypes).toEqual([
        { id: 1, label: 'Ouvert à tous' },
      ]);
    });

    it('✅ Doit convertir les Decimal latitude/longitude en number', async () => {
      const mission = makePrismaMission({
        address: {
          id: 1,
          street: '55 Avenue Sainte-Victoire',
          postalCode: '13100',
          city: 'Aix-en-Provence',
          latitude: '43.5325000',
          longitude: '5.4578000',
        },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([mission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.findAll(defaultQuery);

      expect(result.missions[0].address?.latitude).toBe(43.5325);
      expect(result.missions[0].address?.longitude).toBe(5.4578);
      expect(typeof result.missions[0].address?.latitude).toBe('number');
    });

    it('✅ Doit retourner null pour address si la mission est à distance', async () => {
      const mission = makePrismaMission({ address: null });
      mockPrismaService.mission.findMany.mockResolvedValue([mission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.findAll(defaultQuery);

      expect(result.missions[0].address).toBeNull();
    });
  });

  // =========================================================================
  // findAll — Pagination
  // =========================================================================
  describe('findAll — pagination', () => {
    it('✅ Doit respecter la page et le pageSize demandés', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 3, pageSize: 5 });

      const callArgs = mockPrismaService.mission.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(10); // (3-1) * 5
      expect(callArgs.take).toBe(5);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(5);
    });

    it('✅ Doit utiliser skip=0 et take=12 pour la page 1 par défaut', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const callArgs = mockPrismaService.mission.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(0);
      expect(callArgs.take).toBe(12);
    });
  });

  // =========================================================================
  // findAll — Filtres
  // =========================================================================
  describe('findAll — filtres', () => {
    it('✅ Doit filtrer par type quand fourni', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, type: 'EVENT' });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      // Le service normalise toujours en { in: [...] } pour supporter types multiples
      expect(whereArg.type).toEqual({ in: ['EVENT'] });
    });

    it('✅ Doit filtrer par causeId quand fourni', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, causeId: 5 });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      // causeId est normalisé en { in: [causeId] } pour supporter causeIds multiples
      expect(whereArg.causes).toEqual({ some: { causeId: { in: [5] } } });
    });

    it('✅ Doit filtrer par ville (insensible à la casse)', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, city: 'aix' });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.address).toEqual({
        city: { contains: 'aix', mode: 'insensitive' },
      });
    });

    it('✅ Doit filtrer par recherche textuelle (titre, description, nom association)', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, search: 'repas' });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { title: { contains: 'repas', mode: 'insensitive' } },
        { description: { contains: 'repas', mode: 'insensitive' } },
        {
          association: {
            name: { contains: 'repas', mode: 'insensitive' },
          },
        },
      ]);
    });

    it('✅ Ne doit pas ajouter de filtre type si non fourni', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.type).toBeUndefined();
    });

    it('✅ Doit combiner plusieurs filtres simultanément', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({
        ...defaultQuery,
        type: 'COLLECT',
        city: 'Aix',
        causeId: 3,
      });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('ACTIVE');
      expect(whereArg.type).toEqual({ in: ['COLLECT'] });
      expect(whereArg.address.city.contains).toBe('Aix');
      expect(whereArg.causes.some.causeId).toEqual({ in: [3] });
    });

    it('✅ Doit filtrer par skillIds quand fourni', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, skillIds: [1, 3] });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.skills).toEqual({ some: { skillId: { in: [1, 3] } } });
    });

    it('✅ Doit filtrer par fréquence quand fournie', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, frequency: 'WEEKLY' });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.frequency).toBe('WEEKLY');
    });

    it('✅ Doit filtrer par plage de dates (startDateFrom et startDateTo)', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({
        ...defaultQuery,
        startDateFrom: '2026-01-01',
        startDateTo: '2026-12-31',
      });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.startDate).toBeDefined();
      expect(whereArg.startDate.gte).toEqual(new Date('2026-01-01'));
      expect(whereArg.startDate.lte).toEqual(new Date('2026-12-31'));
    });

    it('✅ Doit filtrer par associationId quand fourni', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, associationId: 5 });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.associationId).toBe(5);
    });

    it('✅ Ne doit pas ajouter de filtre associationId si absent', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.associationId).toBeUndefined();
    });

    it('✅ Doit filtrer en mode REMOTE (locationMode=remote)', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, locationMode: 'remote' });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.availabilityType).toBe('REMOTE');
    });

    it('✅ Doit filtrer en mode ON_SITE/HYBRID (locationMode=nearby)', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, locationMode: 'nearby' });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.availabilityType).toEqual({ in: ['ON_SITE', 'HYBRID'] });
    });
  });

  // =========================================================================
  // findAll — hasAvailableSpots (filtre JS post-fetch)
  // =========================================================================
  describe('findAll — hasAvailableSpots', () => {
    const makeMissionWithCount = (
      volunteersNeeded: number | null,
      participantsCount: number,
    ) => ({
      ...makePrismaMission({ volunteersNeeded }),
      availabilityType: 'ON_SITE',
      status: 'ACTIVE',
      _count: { participants: participantsCount },
    });

    it('✅ Doit retourner uniquement les missions avec places disponibles', async () => {
      const available = makeMissionWithCount(10, 5); // 5 places restantes
      const full = makeMissionWithCount(3, 3); // complet

      // Prisma retourne seulement les missions avec volunteersNeeded != null
      mockPrismaService.mission.findMany.mockResolvedValue([available, full]);
      mockPrismaService.mission.count.mockResolvedValue(2);

      const result = await service.findAll({
        ...defaultQuery,
        hasAvailableSpots: true,
      });

      // Le filtre JS post-fetch doit éliminer la mission "full"
      expect(result.missions).toHaveLength(1);
      expect(result.missions[0].volunteersNeeded).toBe(10);
    });

    it('✅ Doit ajouter volunteersNeeded NOT NULL dans le where Prisma', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, hasAvailableSpots: true });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.volunteersNeeded).toEqual({ not: null });
    });

    it('✅ Le total retourné correspond aux résultats filtrés (pas au count Prisma)', async () => {
      const available = makeMissionWithCount(10, 5);
      const full = makeMissionWithCount(3, 3);

      mockPrismaService.mission.findMany.mockResolvedValue([available, full]);
      mockPrismaService.mission.count.mockResolvedValue(2);

      const result = await service.findAll({
        ...defaultQuery,
        hasAvailableSpots: true,
      });

      // Le total doit refléter le résultat après filtre JS (1), pas le count Prisma (2)
      expect(result.total).toBe(1);
    });
  });

  // =========================================================================
  // findForMap
  // =========================================================================
  describe('findForMap', () => {
    it('✅ Doit retourner les missions géolocalisées avec les champs aplatis', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([
        makePrismaMapMission(),
      ]);

      const result = await service.findForMap();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        title: 'Distribution de repas chauds',
        description: 'Chaque mardi soir, distribution de repas.',
        type: 'MISSION',
        latitude: 43.5325,
        longitude: 5.4578,
        city: 'Aix-en-Provence',
        association: { name: 'Les Restos du Cœur Aix', logoUrl: null },
      });
    });

    it('✅ Doit filtrer les missions ACTIVE avec coordonnées non-null', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.findForMap();

      const callArgs = mockPrismaService.mission.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe('ACTIVE');
      expect(callArgs.where.address.latitude).toEqual({ not: null });
      expect(callArgs.where.address.longitude).toEqual({ not: null });
    });

    it('✅ Doit limiter le nombre de résultats (MAX_MAP_RESULTS)', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.findForMap();

      const callArgs = mockPrismaService.mission.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(500);
    });

    it('✅ Doit trier par createdAt desc', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.findForMap();

      const callArgs = mockPrismaService.mission.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('✅ Doit convertir les Decimal en number pour lat/lng', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([
        makePrismaMapMission(),
      ]);

      const result = await service.findForMap();

      expect(typeof result[0].latitude).toBe('number');
      expect(typeof result[0].longitude).toBe('number');
    });
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe('findById', () => {
    it('✅ Doit retourner le détail complet avec les relations aplaties', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(
        makePrismaDetailMission(),
      );

      const result = await service.findById(1);

      expect(result.id).toBe(1);
      expect(result.participantsCount).toBe(5);
      expect(result.causes).toEqual([{ id: 1, label: 'Distribution' }]);
      expect(result.publicTypes).toEqual([
        { id: 1, label: 'Personnes en difficulté' },
      ]);
    });

    it("❌ Doit lever NotFoundException si la mission n'existe pas", async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        'Mission #999 introuvable',
      );
    });

    it('✅ Doit appeler findUnique avec le bon ID', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(
        makePrismaDetailMission(),
      );

      await service.findById(42);

      expect(mockPrismaService.mission.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 42 } }),
      );
    });

    it('✅ Doit convertir les Decimal latitude/longitude dans le détail', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(
        makePrismaDetailMission({
          address: {
            id: 1,
            street: '55 Avenue Sainte-Victoire',
            postalCode: '13100',
            city: 'Aix-en-Provence',
            latitude: '43.5325000',
            longitude: '5.4578000',
          },
        }),
      );

      const result = await service.findById(1);

      expect(result.address?.latitude).toBe(43.5325);
      expect(typeof result.address?.latitude).toBe('number');
    });

    it('✅ Doit retourner null pour address si la mission est à distance', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(
        makePrismaDetailMission({ address: null }),
      );

      const result = await service.findById(1);

      expect(result.address).toBeNull();
    });

    it('❌ Lève NotFoundException si le statut est DELETED (soft-delete)', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(
        makePrismaDetailMission({ status: 'DELETED' }),
      );

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
      await expect(service.findById(1)).rejects.toThrow(
        'Mission #1 introuvable',
      );
    });

    it('✅ Retourne la mission si le statut est ARCHIVED (accessible aux membres/participants)', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(
        makePrismaDetailMission({ status: 'ARCHIVED' }),
      );

      const result = await service.findById(1);

      expect(result.status).toBe('ARCHIVED');
    });
  });

  // =========================================================================
  // findAll — filtre missions expirées
  // =========================================================================
  describe('findAll — exclusion des missions expirées', () => {
    it('✅ Inclut un filtre OR pour exclure les missions dont endDate est dépassée', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(Array.isArray(whereArg.OR)).toBe(true);
      expect(whereArg.OR).toEqual(
        expect.arrayContaining([
          { endDate: null },
          expect.objectContaining({
            endDate: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        ]),
      );
    });

    it('✅ Conserve le filtre status ACTIVE en même temps que le filtre endDate', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll(defaultQuery);

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('ACTIVE');
      expect(whereArg.OR).toBeDefined();
    });
  });

  // =========================================================================
  // findForMap — filtre missions expirées
  // =========================================================================
  describe('findForMap — exclusion des missions expirées', () => {
    it('✅ Inclut un filtre OR pour exclure les missions dont endDate est dépassée', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.findForMap();

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(Array.isArray(whereArg.OR)).toBe(true);
      expect(whereArg.OR).toEqual(
        expect.arrayContaining([
          { endDate: null },
          expect.objectContaining({
            endDate: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        ]),
      );
    });

    it('✅ Conserve le filtre status ACTIVE et la contrainte adresse géolocalisée', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.findForMap();

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('ACTIVE');
      expect(whereArg.address).toBeDefined();
      expect(whereArg.OR).toBeDefined();
    });
  });

  // =========================================================================
  // Matching — enrichissement matchScore / matchBreakdown
  // =========================================================================
  describe('matching (withMatching=true)', () => {
    const userForScoring = {
      skills: [{ skill: { id: 1 } }],
      causes: [{ cause: { id: 1 } }],
      availability: { type: 'ON_SITE', timeSlot: ['ALL_TIME'] },
      address: { latitude: 43.5, longitude: 5.4 },
      participations: [],
    };

    const sampleScore = {
      total: 75,
      breakdown: {
        causes: 30,
        skills: 25,
        availability: 20,
        distance: 0,
        history: 0,
      },
      isMatch: true,
    };

    describe('findAll', () => {
      it("✅ N'enrichit PAS si pas de userId, même avec withMatching=true", async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          makePrismaMission(),
        ]);
        mockPrismaService.mission.count.mockResolvedValue(1);

        const result = await service.findAll({
          ...defaultQuery,
          withMatching: true,
        });

        expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
        expect(mockMatchingService.scoreUserMission).not.toHaveBeenCalled();
        expect(result.missions[0].matchScore).toBeUndefined();
        expect(result.missions[0].matchBreakdown).toBeUndefined();
      });

      it("✅ N'enrichit PAS si userId présent mais withMatching absent", async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          makePrismaMission(),
        ]);
        mockPrismaService.mission.count.mockResolvedValue(1);

        const result = await service.findAll(defaultQuery, 42);

        expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
        expect(mockMatchingService.scoreUserMission).not.toHaveBeenCalled();
        expect(result.missions[0].matchScore).toBeUndefined();
      });

      it("✅ Charge l'utilisateur UNE SEULE FOIS pour N missions", async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          makePrismaMission({ id: 1 }),
          makePrismaMission({ id: 2 }),
          makePrismaMission({ id: 3 }),
        ]);
        mockPrismaService.mission.count.mockResolvedValue(3);
        mockPrismaService.user.findUnique.mockResolvedValue(userForScoring);
        mockMatchingService.scoreUserMission.mockReturnValue(sampleScore);

        await service.findAll({ ...defaultQuery, withMatching: true }, 42);

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockMatchingService.scoreUserMission).toHaveBeenCalledTimes(3);
      });

      it('✅ Enrichit chaque mission avec matchScore et matchBreakdown', async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          makePrismaMission(),
        ]);
        mockPrismaService.mission.count.mockResolvedValue(1);
        mockPrismaService.user.findUnique.mockResolvedValue(userForScoring);
        mockMatchingService.scoreUserMission.mockReturnValue(sampleScore);

        const result = await service.findAll(
          { ...defaultQuery, withMatching: true },
          42,
        );

        expect(result.missions[0].matchScore).toBe(75);
        expect(result.missions[0].matchBreakdown).toEqual(
          sampleScore.breakdown,
        );
      });

      it("✅ Si l'utilisateur n'existe plus en BDD, n'enrichit pas", async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          makePrismaMission(),
        ]);
        mockPrismaService.mission.count.mockResolvedValue(1);
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        const result = await service.findAll(
          { ...defaultQuery, withMatching: true },
          999,
        );

        expect(mockMatchingService.scoreUserMission).not.toHaveBeenCalled();
        expect(result.missions[0].matchScore).toBeUndefined();
      });
    });

    describe('findForMap', () => {
      it("✅ N'enrichit PAS si pas de userId", async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          makePrismaMapMission(),
        ]);

        const result = await service.findForMap({ withMatching: true });

        expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
        expect(result[0].matchScore).toBeUndefined();
      });

      it('✅ Étend le select Prisma avec causes/skills/startDate quand withMatching+userId', async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([]);
        mockPrismaService.user.findUnique.mockResolvedValue(userForScoring);

        await service.findForMap({ withMatching: true }, 42);

        const selectArg =
          mockPrismaService.mission.findMany.mock.calls[0][0].select;
        expect(selectArg.causes).toBeDefined();
        expect(selectArg.skills).toBeDefined();
        expect(selectArg.startDate).toBe(true);
      });

      it("✅ N'étend PAS le select sans withMatching", async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([]);

        await service.findForMap({});

        const selectArg =
          mockPrismaService.mission.findMany.mock.calls[0][0].select;
        expect(selectArg.causes).toBeUndefined();
        expect(selectArg.skills).toBeUndefined();
        expect(selectArg.startDate).toBeUndefined();
      });

      it('✅ Enrichit chaque mission avec matchScore et matchBreakdown', async () => {
        mockPrismaService.mission.findMany.mockResolvedValue([
          {
            ...makePrismaMapMission(),
            startDate: new Date('2026-05-01'),
            causes: [{ cause: { id: 1 } }],
            skills: [{ skill: { id: 1 } }],
          },
        ]);
        mockPrismaService.user.findUnique.mockResolvedValue(userForScoring);
        mockMatchingService.scoreUserMission.mockReturnValue(sampleScore);

        const result = await service.findForMap({ withMatching: true }, 42);

        expect(result[0].matchScore).toBe(75);
        expect(result[0].matchBreakdown).toEqual(sampleScore.breakdown);
      });
    });
  });
});
