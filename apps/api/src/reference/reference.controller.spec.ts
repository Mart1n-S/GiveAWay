import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';

const mockReferenceService = {
  getSkills: jest.fn(),
  getCauses: jest.fn(),
  getAssociationCategories: jest.fn(),
  getPublicTypes: jest.fn(),
  getVolunteerTypes: jest.fn(),
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

  // ===========================================================================
  // getSkills
  // ===========================================================================
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

    it('✅ Doit propager une erreur du service', async () => {
      mockReferenceService.getSkills.mockRejectedValue(new Error('DB error'));

      await expect(controller.getSkills()).rejects.toThrow('DB error');
    });
  });

  // ===========================================================================
  // getCauses
  // ===========================================================================
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

    it('✅ Doit propager une erreur du service', async () => {
      mockReferenceService.getCauses.mockRejectedValue(new Error('DB error'));

      await expect(controller.getCauses()).rejects.toThrow('DB error');
    });
  });

  // ===========================================================================
  // getAssociationCategories
  // ===========================================================================
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

    it('✅ Doit propager une erreur du service', async () => {
      mockReferenceService.getAssociationCategories.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.getAssociationCategories()).rejects.toThrow(
        'DB error',
      );
    });
  });

  // ===========================================================================
  // getPublicTypes
  // ===========================================================================
  describe('getPublicTypes', () => {
    it('✅ Doit retourner la liste des types de publics ciblés', async () => {
      const mockPublicTypes = [
        { id: 1, label: 'Enfants' },
        { id: 2, label: 'Personnes âgées' },
      ];
      mockReferenceService.getPublicTypes.mockResolvedValue(mockPublicTypes);

      const result = await controller.getPublicTypes();

      expect(mockReferenceService.getPublicTypes).toHaveBeenCalled();
      expect(result).toEqual(mockPublicTypes);
    });

    it('✅ Doit retourner un tableau vide si aucun type de public', async () => {
      mockReferenceService.getPublicTypes.mockResolvedValue([]);

      const result = await controller.getPublicTypes();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockReferenceService.getPublicTypes.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.getPublicTypes()).rejects.toThrow('DB error');
    });
  });

  // ===========================================================================
  // getVolunteerTypes
  // ===========================================================================
  describe('getVolunteerTypes', () => {
    it('✅ Doit retourner la liste des types de bénévoles', async () => {
      const mockVolunteerTypes = [
        { id: 1, label: 'Bénévole ponctuel' },
        { id: 2, label: 'Majeurs uniquement' },
      ];
      mockReferenceService.getVolunteerTypes.mockResolvedValue(
        mockVolunteerTypes,
      );

      const result = await controller.getVolunteerTypes();

      expect(mockReferenceService.getVolunteerTypes).toHaveBeenCalled();
      expect(result).toEqual(mockVolunteerTypes);
    });

    it('✅ Doit retourner un tableau vide si aucun type de bénévole', async () => {
      mockReferenceService.getVolunteerTypes.mockResolvedValue([]);

      const result = await controller.getVolunteerTypes();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockReferenceService.getVolunteerTypes.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.getVolunteerTypes()).rejects.toThrow('DB error');
    });
  });
});
