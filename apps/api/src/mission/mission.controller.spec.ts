import { Test, TestingModule } from '@nestjs/testing';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';
import { MissionListResponse, MissionListQueryDto } from '@repo/shared';

const mockMissionService = {
  findAll: jest.fn(),
  findForMap: jest.fn(),
  findById: jest.fn(),
};

const makeMockResponse = (
  overrides: Partial<MissionListResponse> = {},
): MissionListResponse => ({
  missions: [],
  total: 0,
  page: 1,
  pageSize: 12,
  ...overrides,
});

const defaultQuery: MissionListQueryDto = { page: 1, pageSize: 12 };
const anonReq = {} as { user?: { id: number } };

describe('MissionController', () => {
  let controller: MissionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionController],
      providers: [{ provide: MissionService, useValue: mockMissionService }],
    }).compile();

    controller = module.get<MissionController>(MissionController);
    jest.clearAllMocks();
  });

  // =========================================================================
  // findAll — Délégation au service
  // =========================================================================
  describe('findAll', () => {
    it('✅ Doit déléguer au service avec les valeurs par défaut', async () => {
      mockMissionService.findAll.mockResolvedValue(makeMockResponse());

      const result = await controller.findAll(defaultQuery, anonReq);

      expect(mockMissionService.findAll).toHaveBeenCalledWith(
        defaultQuery,
        undefined,
      );
      expect(result.missions).toEqual([]);
    });

    it('✅ Doit transmettre tous les paramètres validés au service', async () => {
      const query: MissionListQueryDto = {
        page: 2,
        pageSize: 6,
        type: 'EVENT',
        causeId: 5,
        city: 'Aix',
        search: 'repas',
      };
      mockMissionService.findAll.mockResolvedValue(
        makeMockResponse({ page: 2, pageSize: 6, total: 20 }),
      );

      const result = await controller.findAll(query, anonReq);

      expect(mockMissionService.findAll).toHaveBeenCalledWith(query, undefined);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(6);
    });

    it("✅ Doit passer uniquement le type quand c'est le seul filtre", async () => {
      const query: MissionListQueryDto = {
        page: 1,
        pageSize: 12,
        type: 'COLLECT',
      };
      mockMissionService.findAll.mockResolvedValue(makeMockResponse());

      await controller.findAll(query, anonReq);

      expect(mockMissionService.findAll).toHaveBeenCalledWith(query, undefined);
    });

    it('✅ Doit retourner la réponse du service telle quelle', async () => {
      const expected = makeMockResponse({ total: 42, page: 3 });
      mockMissionService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(
        { page: 3, pageSize: 12 },
        anonReq,
      );

      expect(result).toEqual(expected);
    });

    it('✅ Doit retourner un résultat vide quand le service ne trouve rien', async () => {
      mockMissionService.findAll.mockResolvedValue(makeMockResponse());

      const result = await controller.findAll(defaultQuery, anonReq);

      expect(result.missions).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockMissionService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(defaultQuery, anonReq)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  // =========================================================================
  // findForMap — Délégation au service
  // =========================================================================
  describe('findForMap', () => {
    it('✅ Doit déléguer au service avec le query fourni', async () => {
      mockMissionService.findForMap.mockResolvedValue([]);

      const result = await controller.findForMap(defaultQuery, anonReq);

      expect(mockMissionService.findForMap).toHaveBeenCalledWith(
        defaultQuery,
        undefined,
      );
      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockMissionService.findForMap.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.findForMap(defaultQuery, anonReq),
      ).rejects.toThrow('Database error');
    });
  });

  // =========================================================================
  // findById — Délégation au service
  // =========================================================================
  describe('findById', () => {
    it("✅ Doit déléguer au service avec l'ID parsé", async () => {
      const mockDetail = { id: 42, title: 'Test' };
      mockMissionService.findById.mockResolvedValue(mockDetail);

      const result = await controller.findById(42);

      expect(mockMissionService.findById).toHaveBeenCalledWith(42);
      expect(result).toEqual(mockDetail);
    });

    it('✅ Doit propager une NotFoundException du service', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      mockMissionService.findById.mockRejectedValue(
        new NotFoundException('Mission #99 introuvable'),
      );

      await expect(controller.findById(99)).rejects.toThrow(
        'Mission #99 introuvable',
      );
    });
  });
});
