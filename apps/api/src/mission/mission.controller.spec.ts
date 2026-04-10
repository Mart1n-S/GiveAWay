import { Test, TestingModule } from '@nestjs/testing';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';
import { MissionListResponse } from '@repo/shared';

const mockMissionService = {
  findAll: jest.fn(),
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

describe('MissionController', () => {
  let controller: MissionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionController],
      providers: [
        { provide: MissionService, useValue: mockMissionService },
      ],
    }).compile();

    controller = module.get<MissionController>(MissionController);
    jest.clearAllMocks();
  });

  // =========================================================================
  // findAll — Délégation au service
  // =========================================================================
  describe('findAll', () => {
    it('✅ Doit déléguer au service sans paramètres', async () => {
      mockMissionService.findAll.mockResolvedValue(makeMockResponse());

      const result = await controller.findAll();

      expect(mockMissionService.findAll).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
        type: undefined,
        causeId: undefined,
        city: undefined,
        search: undefined,
      });
      expect(result.missions).toEqual([]);
    });

    it('✅ Doit convertir les query params string en types corrects', async () => {
      mockMissionService.findAll.mockResolvedValue(
        makeMockResponse({ page: 2, pageSize: 6, total: 20 }),
      );

      const result = await controller.findAll('2', '6', 'EVENT', '5', 'Aix', 'repas');

      expect(mockMissionService.findAll).toHaveBeenCalledWith({
        page: 2,
        pageSize: 6,
        type: 'EVENT',
        causeId: 5,
        city: 'Aix',
        search: 'repas',
      });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(6);
    });

    it('✅ Doit passer uniquement le type quand c\'est le seul filtre', async () => {
      mockMissionService.findAll.mockResolvedValue(makeMockResponse());

      await controller.findAll(undefined, undefined, 'COLLECT');

      expect(mockMissionService.findAll).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
        type: 'COLLECT',
        causeId: undefined,
        city: undefined,
        search: undefined,
      });
    });

    it('✅ Doit retourner la réponse du service telle quelle', async () => {
      const expected = makeMockResponse({ total: 42, page: 3 });
      mockMissionService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('3');

      expect(result).toEqual(expected);
    });

    it('✅ Doit retourner un résultat vide quand le service ne trouve rien', async () => {
      mockMissionService.findAll.mockResolvedValue(makeMockResponse());

      const result = await controller.findAll();

      expect(result.missions).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockMissionService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
