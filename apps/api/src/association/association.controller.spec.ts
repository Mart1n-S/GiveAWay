import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  AssociationPublicListResponse,
  AssociationPublicProfile,
} from '@repo/shared';

// ── Mocks ─────────────────────────────────────────────────────────

const mockAssociationService = {
  findNearby: jest.fn(),
  findPublicList: jest.fn(),
  findPublicProfile: jest.fn(),
  getAssociation: jest.fn(),
  updateAssociation: jest.fn(),
  getDocumentForDownload: jest.fn(),
  getMembers: jest.fn(),
  getAssociationMissions: jest.fn(),
  addMember: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  leaveAssociation: jest.fn(),
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
  // getPublicList
  // =========================================================================
  describe('getPublicList', () => {
    const mockPublicList: AssociationPublicListResponse = {
      associations: [
        {
          id: 1,
          name: 'Croix-Rouge Paris',
          description: null,
          logoUrl: null,
          website: null,
          category: 'Humanitaire',
          city: 'Paris',
          activeMissionsCount: 3,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 12,
    };

    it('✅ Doit déléguer au service avec les valeurs par défaut', async () => {
      mockAssociationService.findPublicList.mockResolvedValue(mockPublicList);

      const result = await controller.getPublicList();

      expect(mockAssociationService.findPublicList).toHaveBeenCalledWith(
        undefined, // search
        undefined, // city
        undefined, // lat
        undefined, // lng
        10, // radius par défaut
        1, // page par défaut
        12, // pageSize par défaut
      );
      expect(result).toEqual(mockPublicList);
    });

    it('✅ Doit convertir les params string en types appropriés', async () => {
      mockAssociationService.findPublicList.mockResolvedValue(mockPublicList);

      await controller.getPublicList(
        'croix',
        'Paris',
        '48.85',
        '2.35',
        '20',
        '2',
        '6',
      );

      expect(mockAssociationService.findPublicList).toHaveBeenCalledWith(
        'croix',
        'Paris',
        48.85,
        2.35,
        20,
        2,
        6,
      );
    });

    it('✅ Doit traiter les chaînes vides comme undefined', async () => {
      mockAssociationService.findPublicList.mockResolvedValue(mockPublicList);

      await controller.getPublicList('', '', '', '', '', '', '');

      expect(mockAssociationService.findPublicList).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        10,
        1,
        12,
      );
    });

    it('✅ Doit retourner une liste vide si aucune association', async () => {
      const emptyList: AssociationPublicListResponse = {
        associations: [],
        total: 0,
        page: 1,
        pageSize: 12,
      };
      mockAssociationService.findPublicList.mockResolvedValue(emptyList);

      const result = await controller.getPublicList();

      expect(result.associations).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockAssociationService.findPublicList.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.getPublicList()).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // getPublicProfile
  // =========================================================================
  describe('getPublicProfile', () => {
    const mockPublicProfile: AssociationPublicProfile = {
      id: 42,
      name: 'Les Restos du Cœur',
      description: 'Aide alimentaire',
      object: 'Objet statutaire',
      legalStatus: 'Association loi 1901',
      logoUrl: null,
      website: null,
      phone: null,
      category: 'Aide alimentaire',
      address: {
        street: '10 rue de la Paix',
        postalCode: '75001',
        city: 'Paris',
        latitude: 48.85,
        longitude: 2.35,
      },
      activeMissionsCount: 5,
      createdAt: new Date().toISOString(),
    };

    it("✅ Doit déléguer au service avec l'ID correct", async () => {
      mockAssociationService.findPublicProfile.mockResolvedValue(
        mockPublicProfile,
      );

      const result = await controller.getPublicProfile(42);

      expect(mockAssociationService.findPublicProfile).toHaveBeenCalledWith(42);
      expect(result).toEqual(mockPublicProfile);
    });

    it("❌ Doit propager NotFoundException si l'association est introuvable", async () => {
      mockAssociationService.findPublicProfile.mockRejectedValue(
        new NotFoundException('Association introuvable'),
      );

      await expect(controller.getPublicProfile(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('✅ Doit retourner le profil complet avec adresse et catégorie', async () => {
      mockAssociationService.findPublicProfile.mockResolvedValue(
        mockPublicProfile,
      );

      const result = await controller.getPublicProfile(42);

      expect(result.address?.city).toBe('Paris');
      expect(result.category).toBe('Aide alimentaire');
      expect(result.activeMissionsCount).toBe(5);
    });
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
    it("✅ Doit déléguer au service avec l'ID, le DTO et les fichiers parsés", async () => {
      const dto: UpdateAssociationDto = { name: 'Nouveau nom' };
      mockAssociationService.updateAssociation.mockResolvedValue({
        ...mockAssociationDto,
        name: 'Nouveau nom',
      });

      const result = await controller.updateAssociation(1, dto);

      expect(mockAssociationService.updateAssociation).toHaveBeenCalledWith(
        1,
        dto,
        undefined, // logoFile
        undefined, // documentFiles
      );
      expect(result.name).toBe('Nouveau nom');
    });

    it('✅ Doit propager BadRequestException si la validation échoue', async () => {
      mockAssociationService.updateAssociation.mockRejectedValue(
        new BadRequestException('Données invalides'),
      );

      await expect(
        controller.updateAssociation(1, { name: 'A' }),
      ).rejects.toThrow(BadRequestException);
    });

    it("✅ Doit propager NotFoundException si l'association est introuvable", async () => {
      mockAssociationService.updateAssociation.mockRejectedValue(
        new NotFoundException('Association introuvable'),
      );

      await expect(
        controller.updateAssociation(999, { description: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // downloadDocument
  // =========================================================================
  describe('downloadDocument', () => {
    let mockRes: {
      redirect: jest.Mock;
      setHeader: jest.Mock;
      end: jest.Mock;
    };

    beforeEach(() => {
      mockRes = {
        redirect: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn(),
      };
    });

    it("✅ Doit rediriger vers l'URL CDN si le service retourne un redirect", async () => {
      mockAssociationService.getDocumentForDownload.mockResolvedValue({
        type: 'redirect',
        url: 'https://cdn.example.com/doc.pdf',
      });

      await controller.downloadDocument(1, 5, mockRes as any);

      expect(
        mockAssociationService.getDocumentForDownload,
      ).toHaveBeenCalledWith(1, 5);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        302,
        'https://cdn.example.com/doc.pdf',
      );
      expect(mockRes.end).not.toHaveBeenCalled();
    });

    it('✅ Doit envoyer le fichier en pièce jointe pour un stockage local', async () => {
      const buffer = Buffer.from('fake-pdf-content');
      mockAssociationService.getDocumentForDownload.mockResolvedValue({
        type: 'file',
        buffer,
        mimeType: 'application/pdf',
        filename: 'document.pdf',
      });

      await controller.downloadDocument(1, 5, mockRes as any);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment'),
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Length',
        buffer.length,
      );
      expect(mockRes.end).toHaveBeenCalledWith(buffer);
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('❌ Doit propager NotFoundException si le document est introuvable', async () => {
      mockAssociationService.getDocumentForDownload.mockRejectedValue(
        new NotFoundException('Document introuvable'),
      );

      await expect(
        controller.downloadDocument(1, 99, mockRes as any),
      ).rejects.toThrow(NotFoundException);
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
  // getAssociationMissions
  // =========================================================================
  describe('getAssociationMissions', () => {
    const mockMissionsResponse = {
      missions: [],
      total: 0,
      page: 1,
      pageSize: 3,
      totalPages: 0,
    };

    it('✅ Doit déléguer au service avec les valeurs par défaut (page=1, pageSize=3)', async () => {
      mockAssociationService.getAssociationMissions.mockResolvedValue(
        mockMissionsResponse,
      );

      const result = await controller.getAssociationMissions(1);

      expect(
        mockAssociationService.getAssociationMissions,
      ).toHaveBeenCalledWith(1, 1, 3);
      expect(result).toEqual(mockMissionsResponse);
    });

    it('✅ Doit transmettre page et pageSize quand fournis en query string', async () => {
      mockAssociationService.getAssociationMissions.mockResolvedValue({
        ...mockMissionsResponse,
        page: 2,
        pageSize: 5,
      });

      await controller.getAssociationMissions(1, '2', '5');

      expect(
        mockAssociationService.getAssociationMissions,
      ).toHaveBeenCalledWith(1, 2, 5);
    });

    it('✅ Doit propager une erreur du service', async () => {
      mockAssociationService.getAssociationMissions.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.getAssociationMissions(1)).rejects.toThrow(
        'DB error',
      );
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

    it('❌ Doit propager NotFoundException si le membre est introuvable', async () => {
      mockAssociationService.updateMemberRole.mockRejectedValue(
        new NotFoundException('Membre introuvable'),
      );

      await expect(
        controller.updateMemberRole(1, 999, { role: 'ADMIN' as any }),
      ).rejects.toThrow(NotFoundException);
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

    it('❌ Doit propager NotFoundException si le membre est introuvable', async () => {
      mockAssociationService.removeMember.mockRejectedValue(
        new NotFoundException('Membre introuvable'),
      );

      await expect(
        controller.removeMember(1, 999, mockRequest(42)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // leaveAssociation
  // =========================================================================
  describe('leaveAssociation', () => {
    it("✅ Doit déléguer au service avec associationId et l'ID de l'utilisateur", async () => {
      mockAssociationService.leaveAssociation.mockResolvedValue(undefined);
      const req = mockRequest(42);

      await controller.leaveAssociation(1, req);

      expect(mockAssociationService.leaveAssociation).toHaveBeenCalledWith(
        1,
        42,
      );
    });

    it('❌ Doit propager ForbiddenException si le requérant est OWNER', async () => {
      mockAssociationService.leaveAssociation.mockRejectedValue(
        new ForbiddenException('Le propriétaire ne peut pas quitter'),
      );

      await expect(
        controller.leaveAssociation(1, mockRequest(42)),
      ).rejects.toThrow(ForbiddenException);
    });

    it("❌ Doit propager NotFoundException si l'utilisateur n'est pas membre", async () => {
      mockAssociationService.leaveAssociation.mockRejectedValue(
        new NotFoundException("Vous n'êtes pas membre de cette association"),
      );

      await expect(
        controller.leaveAssociation(1, mockRequest(42)),
      ).rejects.toThrow(NotFoundException);
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
