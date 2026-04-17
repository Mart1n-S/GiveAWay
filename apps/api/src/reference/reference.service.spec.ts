import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceService } from './reference.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  skill: { findMany: jest.fn() },
  cause: { findMany: jest.fn() },
  associationCategory: { findMany: jest.fn() },
  publicType: { findMany: jest.fn() },
  volunteerType: { findMany: jest.fn() },
};

describe('ReferenceService', () => {
  let service: ReferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReferenceService>(ReferenceService);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // getSkills
  // ===========================================================================
  describe('getSkills', () => {
    it('✅ Doit retourner la liste des compétences triées alphabétiquement', async () => {
      const mockSkills = [
        { id: 1, label: 'Informatique' },
        { id: 2, label: 'Jardinage' },
      ];
      mockPrismaService.skill.findMany.mockResolvedValue(mockSkills);

      const result = await service.getSkills();

      expect(mockPrismaService.skill.findMany).toHaveBeenCalledWith({
        orderBy: { label: 'asc' },
        select: { id: true, label: true },
      });
      expect(result).toEqual(mockSkills);
      expect(result).toHaveLength(2);
    });

    it('✅ Doit retourner un tableau vide si aucune compétence', async () => {
      mockPrismaService.skill.findMany.mockResolvedValue([]);

      const result = await service.getSkills();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur Prisma', async () => {
      mockPrismaService.skill.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.getSkills()).rejects.toThrow('DB error');
    });
  });

  // ===========================================================================
  // getCauses
  // ===========================================================================
  describe('getCauses', () => {
    it('✅ Doit retourner la liste des causes triées alphabétiquement', async () => {
      const mockCauses = [
        { id: 1, label: 'Écologie' },
        { id: 2, label: 'Solidarité' },
      ];
      mockPrismaService.cause.findMany.mockResolvedValue(mockCauses);

      const result = await service.getCauses();

      expect(mockPrismaService.cause.findMany).toHaveBeenCalledWith({
        orderBy: { label: 'asc' },
        select: { id: true, label: true },
      });
      expect(result).toEqual(mockCauses);
      expect(result).toHaveLength(2);
    });

    it('✅ Doit retourner un tableau vide si aucune cause', async () => {
      mockPrismaService.cause.findMany.mockResolvedValue([]);

      const result = await service.getCauses();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur Prisma', async () => {
      mockPrismaService.cause.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.getCauses()).rejects.toThrow('DB error');
    });
  });

  // ===========================================================================
  // getAssociationCategories
  // ===========================================================================
  describe('getAssociationCategories', () => {
    it('✅ Doit retourner la liste des catégories triées par nom', async () => {
      const mockCategories = [
        { id: 1, name: 'Aide alimentaire' },
        { id: 2, name: 'Environnement' },
      ];
      mockPrismaService.associationCategory.findMany.mockResolvedValue(
        mockCategories,
      );

      const result = await service.getAssociationCategories();

      expect(
        mockPrismaService.associationCategory.findMany,
      ).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      expect(result).toEqual(mockCategories);
      expect(result).toHaveLength(2);
    });

    it('✅ Doit retourner un tableau vide si aucune catégorie', async () => {
      mockPrismaService.associationCategory.findMany.mockResolvedValue([]);

      const result = await service.getAssociationCategories();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur Prisma', async () => {
      mockPrismaService.associationCategory.findMany.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.getAssociationCategories()).rejects.toThrow(
        'DB error',
      );
    });
  });

  // ===========================================================================
  // getPublicTypes
  // ===========================================================================
  describe('getPublicTypes', () => {
    it('✅ Doit retourner la liste des types de publics triés alphabétiquement', async () => {
      const mockPublicTypes = [
        { id: 1, label: 'Enfants' },
        { id: 2, label: 'Personnes âgées' },
        { id: 3, label: 'Personnes en situation de handicap' },
      ];
      mockPrismaService.publicType.findMany.mockResolvedValue(mockPublicTypes);

      const result = await service.getPublicTypes();

      expect(mockPrismaService.publicType.findMany).toHaveBeenCalledWith({
        orderBy: { label: 'asc' },
        select: { id: true, label: true },
      });
      expect(result).toEqual(mockPublicTypes);
      expect(result).toHaveLength(3);
    });

    it('✅ Doit retourner un tableau vide si aucun type de public', async () => {
      mockPrismaService.publicType.findMany.mockResolvedValue([]);

      const result = await service.getPublicTypes();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur Prisma', async () => {
      mockPrismaService.publicType.findMany.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.getPublicTypes()).rejects.toThrow('DB error');
    });
  });

  // ===========================================================================
  // getVolunteerTypes
  // ===========================================================================
  describe('getVolunteerTypes', () => {
    it('✅ Doit retourner la liste des types de bénévoles triés alphabétiquement', async () => {
      const mockVolunteerTypes = [
        { id: 1, label: 'Bénévole ponctuel' },
        { id: 2, label: 'Bénévole régulier' },
        { id: 3, label: 'Majeurs uniquement' },
      ];
      mockPrismaService.volunteerType.findMany.mockResolvedValue(
        mockVolunteerTypes,
      );

      const result = await service.getVolunteerTypes();

      expect(mockPrismaService.volunteerType.findMany).toHaveBeenCalledWith({
        orderBy: { label: 'asc' },
        select: { id: true, label: true },
      });
      expect(result).toEqual(mockVolunteerTypes);
      expect(result).toHaveLength(3);
    });

    it('✅ Doit retourner un tableau vide si aucun type de bénévole', async () => {
      mockPrismaService.volunteerType.findMany.mockResolvedValue([]);

      const result = await service.getVolunteerTypes();

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur Prisma', async () => {
      mockPrismaService.volunteerType.findMany.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.getVolunteerTypes()).rejects.toThrow('DB error');
    });
  });
});
