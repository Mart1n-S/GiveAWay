import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssociationMissionsController } from './association-missions.controller';
import { AssociationMissionsService } from './association-missions.service';
import { AssociationMemberGuard } from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';
import type {
  AssociationMissionItem,
  AssociationMissionDashboard,
  CreateMissionDto,
  UpdateMissionDto,
} from '@repo/shared';

// ── Fixtures ──────────────────────────────────────────────────────

const mockMissionItem: AssociationMissionItem = {
  id: 1,
  title: 'Mission test',
  description: 'Description de la mission de test.',
  type: 'MISSION' as any,
  availabilityType: 'REMOTE' as any,
  status: 'ACTIVE' as any,
  hasRegistration: true,
  volunteersNeeded: null,
  durationInt: null,
  frequency: null,
  startDate: null,
  endDate: null,
  participantsCount: 0,
  address: null,
  causes: [],
  skills: [],
  volunteerTypes: [],
  publicTypes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDashboard: AssociationMissionDashboard = {
  missions: {
    active: [mockMissionItem],
    upcoming: [],
    past: [],
    archived: [],
  },
  counts: { active: 1, upcoming: 0, past: 0, archived: 0 },
};

// ── Mock service ──────────────────────────────────────────────────

const mockService = {
  create: jest.fn(),
  getDashboard: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  delete: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────

describe('AssociationMissionsController', () => {
  let controller: AssociationMissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssociationMissionsController],
      providers: [
        { provide: AssociationMissionsService, useValue: mockService },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AssociationMemberGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AssociationRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AssociationMissionsController>(
      AssociationMissionsController,
    );
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateMissionDto = {
      title: 'Nouvelle mission',
      description: 'Description suffisamment longue pour la validation du DTO.',
      type: 'MISSION' as any,
      availabilityType: 'REMOTE' as any,
      hasRegistration: true,
    };

    it('✅ délègue au service et retourne la mission créée', async () => {
      mockService.create.mockResolvedValue(mockMissionItem);

      const result = await controller.create(1, dto);

      expect(mockService.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockMissionItem);
    });

    it("❌ propage ForbiddenException si l'association n'est pas validée", async () => {
      mockService.create.mockRejectedValue(
        new ForbiddenException('Association non validée'),
      );

      await expect(controller.create(1, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("❌ propage NotFoundException si l'association est introuvable", async () => {
      mockService.create.mockRejectedValue(
        new NotFoundException('Association introuvable'),
      );

      await expect(controller.create(99, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ propage UnprocessableEntityException si un ID de référence est invalide', async () => {
      mockService.create.mockRejectedValue(
        new UnprocessableEntityException('Compétence #999 introuvable'),
      );

      await expect(
        controller.create(1, { ...dto, skillIds: [999] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── getDashboard ─────────────────────────────────────────────────
  describe('getDashboard', () => {
    it('✅ délègue au service et retourne le dashboard', async () => {
      mockService.getDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard(1);

      expect(mockService.getDashboard).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockDashboard);
    });

    it('✅ retourne un dashboard vide si aucune mission', async () => {
      const empty: AssociationMissionDashboard = {
        missions: { active: [], upcoming: [], past: [], archived: [] },
        counts: { active: 0, upcoming: 0, past: 0, archived: 0 },
      };
      mockService.getDashboard.mockResolvedValue(empty);

      const result = await controller.getDashboard(1);

      expect(result.counts.active).toBe(0);
      expect(result.missions.active).toHaveLength(0);
    });

    it('❌ propage une erreur du service', async () => {
      mockService.getDashboard.mockRejectedValue(new Error('DB error'));

      await expect(controller.getDashboard(1)).rejects.toThrow('DB error');
    });
  });

  // ── findOne ──────────────────────────────────────────────────────
  describe('findOne', () => {
    it('✅ délègue au service avec les deux IDs', async () => {
      mockService.findOne.mockResolvedValue(mockMissionItem);

      const result = await controller.findOne(1, 1);

      expect(mockService.findOne).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockMissionItem);
    });

    it('❌ propage NotFoundException si la mission est introuvable', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Mission #999 introuvable'),
      );

      await expect(controller.findOne(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ propage NotFoundException si la mission appartient à une autre association', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Mission #1 introuvable'),
      );

      await expect(controller.findOne(99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────
  describe('update', () => {
    const dto: UpdateMissionDto = { title: 'Titre modifié' };

    it('✅ délègue au service avec associationId, missionId et DTO', async () => {
      const updated = { ...mockMissionItem, title: 'Titre modifié' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(1, 1, dto);

      expect(mockService.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result.title).toBe('Titre modifié');
    });

    it("✅ retourne les warnings si l'adresse ou les dates ont changé", async () => {
      const withWarning = {
        ...mockMissionItem,
        warnings: [
          "L'adresse a été modifiée. Des bénévoles sont déjà inscrits.",
        ],
      };
      mockService.update.mockResolvedValue(withWarning);

      const result = await controller.update(1, 1, {
        address: {
          street: '1 rue Nouvelle',
          postalCode: '75001',
          city: 'Paris',
        },
      });

      expect((result as any).warnings).toHaveLength(1);
    });

    it('❌ propage UnprocessableEntityException si la mission est archivée', async () => {
      mockService.update.mockRejectedValue(
        new UnprocessableEntityException(
          'Les missions archivées ne peuvent pas être modifiées',
        ),
      );

      await expect(controller.update(1, 1, dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ propage NotFoundException si la mission est introuvable', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException('Mission introuvable'),
      );

      await expect(controller.update(1, 999, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── archive ──────────────────────────────────────────────────────
  describe('archive', () => {
    it('✅ délègue au service et retourne la mission archivée', async () => {
      const archived = { ...mockMissionItem, status: 'ARCHIVED' as any };
      mockService.archive.mockResolvedValue(archived);

      const result = await controller.archive(1, 1);

      expect(mockService.archive).toHaveBeenCalledWith(1, 1);
      expect(result.status).toBe('ARCHIVED');
    });

    it('❌ propage UnprocessableEntityException si déjà archivée', async () => {
      mockService.archive.mockRejectedValue(
        new UnprocessableEntityException(
          'Cette mission est déjà archivée ou supprimée',
        ),
      );

      await expect(controller.archive(1, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ propage NotFoundException si la mission est introuvable', async () => {
      mockService.archive.mockRejectedValue(
        new NotFoundException('Mission introuvable'),
      );

      await expect(controller.archive(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── unarchive ────────────────────────────────────────────────────
  describe('unarchive', () => {
    it('✅ délègue au service et retourne la mission désarchivée', async () => {
      const reactivated = { ...mockMissionItem, status: 'ACTIVE' as any };
      mockService.unarchive.mockResolvedValue(reactivated);

      const result = await controller.unarchive(1, 1);

      expect(mockService.unarchive).toHaveBeenCalledWith(1, 1);
      expect(result.status).toBe('ACTIVE');
    });

    it("❌ propage UnprocessableEntityException si la mission n'est pas archivée", async () => {
      mockService.unarchive.mockRejectedValue(
        new UnprocessableEntityException(
          'Seules les missions archivées peuvent être désarchivées',
        ),
      );

      await expect(controller.unarchive(1, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────
  describe('remove', () => {
    it('✅ délègue au service et ne retourne rien (204)', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(1, 1);

      expect(mockService.delete).toHaveBeenCalledWith(1, 1);
      expect(result).toBeUndefined();
    });

    it('❌ propage UnprocessableEntityException si la mission est archivée', async () => {
      mockService.delete.mockRejectedValue(
        new UnprocessableEntityException(
          'Les missions archivées ne peuvent pas être supprimées',
        ),
      );

      await expect(controller.remove(1, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ propage NotFoundException si la mission est introuvable', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Mission #999 introuvable'),
      );

      await expect(controller.remove(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
