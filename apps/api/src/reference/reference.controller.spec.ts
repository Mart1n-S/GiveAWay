import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';

const mockReferenceService = {
  getSkills: jest.fn(),
  getCauses: jest.fn(),
  getAssociationCategories: jest.fn(),
};

describe('ReferenceController', () => {
  let controller: ReferenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferenceController],
      providers: [
        { provide: ReferenceService, useValue: mockReferenceService },
      ],
    }).compile();

    controller = module.get<ReferenceController>(ReferenceController);
    jest.clearAllMocks();
  });

  describe('getSkills', () => {
    it('✅ Doit retourner la liste des compétences', async () => {
      const mockSkills = [
        { id: 1, label: 'Informatique' },
        { id: 2, label: 'Jardinage' },
      ];
      mockReferenceService.getSkills.mockResolvedValue(mockSkills);

      const result = await controller.getSkills();

      expect(mockReferenceService.getSkills).toHaveBeenCalled();
      expect(result).toEqual(mockSkills);
    });

    it('✅ Doit retourner un tableau vide si aucune compétence', async () => {
      mockReferenceService.getSkills.mockResolvedValue([]);

      const result = await controller.getSkills();

      expect(result).toEqual([]);
    });
  });

  describe('getCauses', () => {
    it('✅ Doit retourner la liste des causes', async () => {
      const mockCauses = [
        { id: 1, label: 'Écologie' },
        { id: 2, label: 'Solidarité' },
      ];
      mockReferenceService.getCauses.mockResolvedValue(mockCauses);

      const result = await controller.getCauses();

      expect(mockReferenceService.getCauses).toHaveBeenCalled();
      expect(result).toEqual(mockCauses);
    });

    it('✅ Doit retourner un tableau vide si aucune cause', async () => {
      mockReferenceService.getCauses.mockResolvedValue([]);

      const result = await controller.getCauses();

      expect(result).toEqual([]);
    });
  });

  describe('getAssociationCategories', () => {
    it("✅ Doit retourner la liste des catégories d'associations", async () => {
      const mockCategories = [
        { id: 1, name: 'Aide alimentaire' },
        { id: 2, name: 'Environnement' },
      ];
      mockReferenceService.getAssociationCategories.mockResolvedValue(
        mockCategories,
      );

      const result = await controller.getAssociationCategories();

      expect(mockReferenceService.getAssociationCategories).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    it('✅ Doit retourner un tableau vide si aucune catégorie', async () => {
      mockReferenceService.getAssociationCategories.mockResolvedValue([]);

      const result = await controller.getAssociationCategories();

      expect(result).toEqual([]);
    });
  });
});
