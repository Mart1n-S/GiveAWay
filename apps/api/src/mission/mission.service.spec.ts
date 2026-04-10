import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MissionService } from './mission.service';
import { PrismaService } from '../prisma/prisma.service';
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
};

describe('MissionService', () => {
  let service: MissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionService,
        { provide: PrismaService, useValue: mockPrismaService },
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
        volunteerTypes: [
          { volunteerType: { id: 1, label: 'Ouvert à tous' } },
        ],
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
      expect(whereArg.type).toBe('EVENT');
    });

    it('✅ Doit filtrer par causeId quand fourni', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.mission.count.mockResolvedValue(0);

      await service.findAll({ ...defaultQuery, causeId: 5 });

      const whereArg =
        mockPrismaService.mission.findMany.mock.calls[0][0].where;
      expect(whereArg.causes).toEqual({ some: { causeId: 5 } });
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
      expect(whereArg.type).toBe('COLLECT');
      expect(whereArg.address.city.contains).toBe('Aix');
      expect(whereArg.causes.some.causeId).toBe(3);
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

    it('❌ Doit lever NotFoundException si la mission n\'existe pas', async () => {
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
  });
});
