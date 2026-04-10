import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceService } from './reference.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  skill: { findMany: jest.fn() },
  cause: { findMany: jest.fn() },
  associationCategory: { findMany: jest.fn() },
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

  describe('getSkills', () => {
    it('✅ Doit retourner la liste des compétences triées', async () => {
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
  });

  describe('getCauses', () => {
    it('✅ Doit retourner la liste des causes triées', async () => {
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
  });

  describe('getAssociationCategories', () => {
    it('✅ Doit retourner la liste des catégories triées par nom', async () => {
      const mockCategories = [
        { id: 1, name: 'Aide alimentaire' },
        { id: 2, name: 'Environnement' },
      ];
      mockPrismaService.associationCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getAssociationCategories();

      expect(mockPrismaService.associationCategory.findMany).toHaveBeenCalledWith({
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
  });
});
