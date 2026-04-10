import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssociationController } from './association.controller';
import { AssociationService } from './association.service';
import { AssociationMemberGuard } from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';
import {
  AssociationDto,
  AssociationMemberDto,
  AssociationMapItem,
  NearbyQueryDto,
  UpdateAssociationDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  TransferOwnerDto,
} from '@repo/shared';

// ── Mocks ─────────────────────────────────────────────────────────

const mockAssociationService = {
  findNearby: jest.fn(),
  getAssociation: jest.fn(),
  updateAssociation: jest.fn(),
  getMembers: jest.fn(),
  addMember: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  transferOwner: jest.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────

const mockAssociationDto: AssociationDto = {
  id: 1,
  name: 'Les Restos du Cœur',
  rna: 'W751234567',
  siret: null,
  object: 'Aide alimentaire',
  legalStatus: 'Association loi 1901',
  phone: null,
  website: null,
  description: null,
  logoUrl: null,
  status: 'VALIDATED' as any,
  requiresManualReview: false,
  rejectionReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  address: null,
  members: [],
  documents: [],
};

const mockMemberDto: AssociationMemberDto = {
  id: 10,
  userId: 42,
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@test.com',
  profilePicture: null,
  role: 'EDITOR' as any,
  createdAt: new Date().toISOString(),
};

const mockMapItem: AssociationMapItem = {
  id: 1,
  name: 'Les Restos du Cœur',
  logoUrl: null,
  city: 'Paris',
  latitude: 48.85,
  longitude: 2.35,
  description: null,
  website: null,
  category: null,
};

const mockNearbyQuery: NearbyQueryDto = {
  lat: 48.85,
  lng: 2.35,
  radius: 10,
  limit: 200,
};

/** Simule l'objet Request NestJS avec user.id */
const mockRequest = (userId: number) => ({ user: { id: userId } }) as any;

// ── Tests ─────────────────────────────────────────────────────────

describe('AssociationController', () => {
  let controller: AssociationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssociationController],
      providers: [
        { provide: AssociationService, useValue: mockAssociationService },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AssociationMemberGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AssociationRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AssociationController>(AssociationController);
    jest.clearAllMocks();
  });

  // =========================================================================
  // getNearby
  // =========================================================================
  describe('getNearby', () => {
    it('✅ Doit déléguer au service avec la query validée', async () => {
      mockAssociationService.findNearby.mockResolvedValue([mockMapItem]);

      const result = await controller.getNearby(mockNearbyQuery);

      expect(mockAssociationService.findNearby).toHaveBeenCalledWith(
        mockNearbyQuery,
      );
      expect(result).toEqual([mockMapItem]);
    });

    it('✅ Doit retourner un tableau vide si aucune association dans le rayon', async () => {
      mockAssociationService.findNearby.mockResolvedValue([]);

      const result = await controller.getNearby(mockNearbyQuery);

      expect(result).toEqual([]);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockAssociationService.findNearby.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.getNearby(mockNearbyQuery)).rejects.toThrow(
        'DB error',
      );
    });
  });

  // =========================================================================
  // getAssociation
  // =========================================================================
  describe('getAssociation', () => {
    it("✅ Doit déléguer au service avec l'ID correct", async () => {
      mockAssociationService.getAssociation.mockResolvedValue(
        mockAssociationDto,
      );

      const result = await controller.getAssociation(1);

      expect(mockAssociationService.getAssociation).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAssociationDto);
    });

    it("✅ Doit propager NotFoundException si l'association n'existe pas", async () => {
      mockAssociationService.getAssociation.mockRejectedValue(
        new NotFoundException('Association introuvable'),
      );

      await expect(controller.getAssociation(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // updateAssociation
  // =========================================================================
  describe('updateAssociation', () => {
    it("✅ Doit déléguer au service avec l'ID et le DTO", async () => {
      const dto: UpdateAssociationDto = { name: 'Nouveau nom' };
      mockAssociationService.updateAssociation.mockResolvedValue({
        ...mockAssociationDto,
        name: 'Nouveau nom',
      });

      const result = await controller.updateAssociation(1, dto);

      expect(mockAssociationService.updateAssociation).toHaveBeenCalledWith(
        1,
        dto,
      );
      expect(result.name).toBe('Nouveau nom');
    });

    it('✅ Doit propager BadRequestException si RNA/SIRET invalide', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockAssociationService.updateAssociation.mockRejectedValue(
        new BadRequestException('RNA invalide'),
      );

      await expect(
        controller.updateAssociation(1, { rna: 'INVALID' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // getMembers
  // =========================================================================
  describe('getMembers', () => {
    it('✅ Doit retourner la liste des membres', async () => {
      mockAssociationService.getMembers.mockResolvedValue([mockMemberDto]);

      const result = await controller.getMembers(1);

      expect(mockAssociationService.getMembers).toHaveBeenCalledWith(1);
      expect(result).toEqual([mockMemberDto]);
    });

    it('✅ Doit retourner un tableau vide si aucun membre', async () => {
      mockAssociationService.getMembers.mockResolvedValue([]);

      const result = await controller.getMembers(1);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // addMember
  // =========================================================================
  describe('addMember', () => {
    it("✅ Doit déléguer au service avec l'ID et le DTO", async () => {
      const dto: AddMemberDto = { email: 'new@test.com' };
      mockAssociationService.addMember.mockResolvedValue(mockMemberDto);

      const result = await controller.addMember(1, dto);

      expect(mockAssociationService.addMember).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockMemberDto);
    });

    it('✅ Doit propager ConflictException si le membre existe déjà', async () => {
      const { ConflictException } = await import('@nestjs/common');
      mockAssociationService.addMember.mockRejectedValue(
        new ConflictException('Déjà membre'),
      );

      await expect(
        controller.addMember(1, { email: 'existing@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it("✅ Doit propager NotFoundException si l'utilisateur est introuvable", async () => {
      mockAssociationService.addMember.mockRejectedValue(
        new NotFoundException('Utilisateur introuvable'),
      );

      await expect(
        controller.addMember(1, { email: 'unknown@test.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // updateMemberRole
  // =========================================================================
  describe('updateMemberRole', () => {
    it('✅ Doit déléguer au service avec associationId, memberId et DTO', async () => {
      const dto: UpdateMemberRoleDto = { role: 'ADMIN' as any };
      mockAssociationService.updateMemberRole.mockResolvedValue({
        ...mockMemberDto,
        role: 'ADMIN' as any,
      });

      const result = await controller.updateMemberRole(1, 10, dto);

      expect(mockAssociationService.updateMemberRole).toHaveBeenCalledWith(
        1,
        10,
        dto,
      );
      expect(result.role).toBe('ADMIN');
    });

    it("✅ Doit propager ForbiddenException si on tente de modifier l'OWNER", async () => {
      mockAssociationService.updateMemberRole.mockRejectedValue(
        new ForbiddenException("Impossible de modifier le rôle de l'OWNER"),
      );

      await expect(
        controller.updateMemberRole(1, 10, { role: 'ADMIN' as any }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // removeMember
  // =========================================================================
  describe('removeMember', () => {
    it("✅ Doit déléguer avec associationId, memberId et l'ID de l'utilisateur requérant", async () => {
      mockAssociationService.removeMember.mockResolvedValue(undefined);
      const req = mockRequest(42);

      await controller.removeMember(1, 10, req);

      expect(mockAssociationService.removeMember).toHaveBeenCalledWith(
        1,
        10,
        42,
      );
    });

    it("✅ Doit propager ForbiddenException si retrait d'un OWNER", async () => {
      mockAssociationService.removeMember.mockRejectedValue(
        new ForbiddenException("Impossible de retirer l'OWNER"),
      );

      await expect(
        controller.removeMember(1, 10, mockRequest(42)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // transferOwner
  // =========================================================================
  describe('transferOwner', () => {
    it("✅ Doit déléguer avec associationId, DTO et l'ID du requérant", async () => {
      mockAssociationService.transferOwner.mockResolvedValue(undefined);
      const dto: TransferOwnerDto = { newOwnerUserId: 99 };
      const req = mockRequest(42);

      await controller.transferOwner(1, req, dto);

      expect(mockAssociationService.transferOwner).toHaveBeenCalledWith(
        1,
        dto,
        42,
      );
    });

    it('✅ Doit propager BadRequestException si transfert à soi-même', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockAssociationService.transferOwner.mockRejectedValue(
        new BadRequestException(
          'Vous ne pouvez pas vous transférer à vous-même',
        ),
      );

      await expect(
        controller.transferOwner(1, mockRequest(42), { newOwnerUserId: 42 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('✅ Doit propager NotFoundException si cible non membre', async () => {
      mockAssociationService.transferOwner.mockRejectedValue(
        new NotFoundException("L'utilisateur cible n'est pas membre"),
      );

      await expect(
        controller.transferOwner(1, mockRequest(42), { newOwnerUserId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
