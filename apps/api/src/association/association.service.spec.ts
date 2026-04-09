import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssociationService } from './association.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssociationVerificationService } from '../auth/register/association-verification.service';
import { AssociationRole, AssociationStatus } from '../generated/prisma/client';

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const mockAddress = {
  id: 1,
  street: '10 rue de la Paix',
  postalCode: '75001',
  city: 'Paris',
  latitude: null,
  longitude: null,
};

const mockUser1 = {
  id: 1,
  firstName: 'Alice',
  lastName: 'Dupont',
  email: 'alice@test.com',
  profilePicture: null,
};

const mockUser2 = {
  id: 2,
  firstName: 'Bob',
  lastName: 'Martin',
  email: 'bob@test.com',
  profilePicture: null,
};

const mockOwnerMember = {
  id: 10,
  userId: mockUser1.id,
  associationId: 42,
  role: AssociationRole.OWNER,
  createdAt: new Date('2024-01-01'),
  user: mockUser1,
};

const mockAdminMember = {
  id: 11,
  userId: mockUser2.id,
  associationId: 42,
  role: AssociationRole.ADMIN,
  createdAt: new Date('2024-01-02'),
  user: mockUser2,
};

const mockEditorUser = {
  id: 3,
  firstName: 'Charlie',
  lastName: 'Petit',
  email: 'charlie@test.com',
  profilePicture: null,
};

const mockEditorMember = {
  id: 12,
  userId: mockEditorUser.id,
  associationId: 42,
  role: AssociationRole.EDITOR,
  createdAt: new Date('2024-01-03'),
  user: mockEditorUser,
};

const mockAssociation = {
  id: 42,
  name: 'Les Amis du Quartier',
  rna: 'W123456789',
  siret: null,
  object: 'Objet statutaire',
  legalStatus: 'Association loi 1901',
  phone: null,
  website: null,
  description: null,
  logoUrl: null,
  status: AssociationStatus.VALIDATED,
  requiresManualReview: false,
  rejectionReason: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  address: mockAddress,
  members: [mockOwnerMember, mockAdminMember],
  documents: [],
  categoryId: null,
  addressId: 1,
};

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockPrisma = {
  association: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  associationUser: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockVerificationService = {
  verifyAssociation: jest.fn(),
};

// ----------------------------------------------------------------
// Suite de tests
// ----------------------------------------------------------------

describe('AssociationService', () => {
  let service: AssociationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: AssociationVerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    service = module.get<AssociationService>(AssociationService);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // getAssociation
  // ===========================================================================
  describe('getAssociation', () => {
    it("✅ Retourne le DTO mappé quand l'association existe", async () => {
      mockPrisma.association.findUnique.mockResolvedValue(mockAssociation);

      const result = await service.getAssociation(42);

      expect(result.id).toBe(42);
      expect(result.name).toBe('Les Amis du Quartier');
      expect(result.members).toHaveLength(2);
      expect(result.documents).toHaveLength(0);
      expect(result.address?.city).toBe('Paris');
    });

    it("❌ Lève NotFoundException quand l'association est introuvable", async () => {
      mockPrisma.association.findUnique.mockResolvedValue(null);

      await expect(service.getAssociation(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('✅ Mappe correctement les membres (rôle, email, createdAt)', async () => {
      mockPrisma.association.findUnique.mockResolvedValue(mockAssociation);

      const result = await service.getAssociation(42);

      const owner = result.members.find(
        (m) => m.role === AssociationRole.OWNER,
      );
      expect(owner).toBeDefined();
      expect(owner?.email).toBe('alice@test.com');
    });

    it("✅ Retourne null pour l'adresse si elle est absente", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        ...mockAssociation,
        address: null,
      });

      const result = await service.getAssociation(42);
      expect(result.address).toBeNull();
    });
  });

  // ===========================================================================
  // updateAssociation
  // ===========================================================================
  describe('updateAssociation', () => {
    it('✅ Met à jour les champs sans appel API si RNA et SIRET inchangés', async () => {
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(mockAssociation)
        .mockResolvedValueOnce(mockAssociation);

      await service.updateAssociation(42, {
        description: 'Nouvelle description',
      });

      expect(mockVerificationService.verifyAssociation).not.toHaveBeenCalled();
      expect(mockPrisma.association.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Nouvelle description',
          }),
        }),
      );
    });

    it('✅ Inclut un upsert adresse quand dto.address est fourni', async () => {
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(mockAssociation)
        .mockResolvedValueOnce(mockAssociation);

      const newAddress = {
        street: '5 avenue de la Liberté',
        postalCode: '69001',
        city: 'Lyon',
        latitude: undefined,
        longitude: undefined,
      };

      await service.updateAssociation(42, { address: newAddress });

      expect(mockPrisma.association.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: expect.objectContaining({
              upsert: expect.objectContaining({
                create: expect.objectContaining({ postalCode: '69001' }),
                update: expect.objectContaining({ postalCode: '69001' }),
              }),
            }),
          }),
        }),
      );
    });

    it("✅ Utilise dto.address dans l'input de vérification quand RNA change", async () => {
      mockPrisma.association.findUnique
        .mockResolvedValueOnce({ ...mockAssociation, rna: 'W111111111' })
        .mockResolvedValueOnce(mockAssociation);

      mockVerificationService.verifyAssociation.mockResolvedValue({
        exists: true,
        isActive: true,
        isConsistent: true,
        officialData: {},
        requiresManualReview: false,
      });

      const newAddress = {
        street: '5 avenue de la Liberté',
        postalCode: '69001',
        city: 'Lyon',
        latitude: undefined,
        longitude: undefined,
      };

      await service.updateAssociation(42, {
        rna: 'W999999999',
        address: newAddress,
      });

      expect(mockVerificationService.verifyAssociation).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.objectContaining({ postalCode: '69001' }),
        }),
      );
    });

    it('✅ Appelle verifyAssociation quand RNA change', async () => {
      const existingWithOldRna = { ...mockAssociation, rna: 'W111111111' };
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(existingWithOldRna)
        .mockResolvedValueOnce(existingWithOldRna);

      mockVerificationService.verifyAssociation.mockResolvedValue({
        exists: true,
        isActive: true,
        isConsistent: true,
        officialData: {},
        requiresManualReview: false,
      });

      await service.updateAssociation(42, { rna: 'W999999999' });

      expect(mockVerificationService.verifyAssociation).toHaveBeenCalledTimes(
        1,
      );
    });

    it('✅ Appelle verifyAssociation quand SIRET change', async () => {
      const existingWithOldSiret = {
        ...mockAssociation,
        siret: '11111111111111',
      };
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(existingWithOldSiret)
        .mockResolvedValueOnce(existingWithOldSiret);

      mockVerificationService.verifyAssociation.mockResolvedValue({
        exists: true,
        isActive: true,
        isConsistent: true,
        officialData: {},
        requiresManualReview: false,
      });

      await service.updateAssociation(42, { siret: '99999999999999' });

      expect(mockVerificationService.verifyAssociation).toHaveBeenCalledTimes(
        1,
      );
    });

    it("❌ Bloque la mise à jour et lève BadRequestException si l'association est dissoute", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        ...mockAssociation,
        rna: 'W111111111',
      });

      mockVerificationService.verifyAssociation.mockResolvedValue({
        exists: true,
        isActive: false,
        isConsistent: false,
        officialData: {},
        requiresManualReview: false,
        rejectionReason: "L'association est fermée (dissoute).",
      });

      await expect(
        service.updateAssociation(42, { rna: 'W999999999' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.association.update).not.toHaveBeenCalled();
    });

    it('✅ Repasse en PENDING et active requiresManualReview si la vérification le requiert', async () => {
      mockPrisma.association.findUnique
        .mockResolvedValueOnce({ ...mockAssociation, rna: 'W111111111' })
        .mockResolvedValueOnce(mockAssociation);

      mockVerificationService.verifyAssociation.mockResolvedValue({
        exists: false,
        isActive: false,
        isConsistent: false,
        officialData: null,
        requiresManualReview: true,
      });

      await service.updateAssociation(42, { rna: 'W999999999' });

      expect(mockPrisma.association.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssociationStatus.PENDING,
            requiresManualReview: true,
          }),
        }),
      );
    });

    it('✅ Ne change pas le statut si la vérification passe', async () => {
      mockPrisma.association.findUnique
        .mockResolvedValueOnce({ ...mockAssociation, rna: 'W111111111' })
        .mockResolvedValueOnce(mockAssociation);

      mockVerificationService.verifyAssociation.mockResolvedValue({
        exists: true,
        isActive: true,
        isConsistent: true,
        officialData: {},
        requiresManualReview: false,
      });

      await service.updateAssociation(42, { rna: 'W999999999' });

      const updateCall = mockPrisma.association.update.mock.calls[0][0];
      expect(updateCall.data.status).toBeUndefined();
      expect(updateCall.data.requiresManualReview).toBeUndefined();
    });

    it("❌ Lève NotFoundException quand l'association est introuvable", async () => {
      mockPrisma.association.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAssociation(42, { name: 'Nouveau nom' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // getMembers
  // ===========================================================================
  describe('getMembers', () => {
    it('✅ Retourne la liste des membres mappés', async () => {
      mockPrisma.associationUser.findMany.mockResolvedValue([
        mockOwnerMember,
        mockAdminMember,
      ]);

      const result = await service.getMembers(42);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe(AssociationRole.OWNER);
      expect(result[1].role).toBe(AssociationRole.ADMIN);
    });

    it('✅ Retourne un tableau vide si pas de membres', async () => {
      mockPrisma.associationUser.findMany.mockResolvedValue([]);

      const result = await service.getMembers(42);
      expect(result).toHaveLength(0);
    });
  });

  // ===========================================================================
  // addMember
  // ===========================================================================
  describe('addMember', () => {
    it('✅ Ajoute un membre avec le rôle EDITOR', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockEditorUser);
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);
      mockPrisma.associationUser.create.mockResolvedValue(mockEditorMember);

      const result = await service.addMember(42, {
        email: 'charlie@test.com',
      });

      expect(mockPrisma.associationUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: AssociationRole.EDITOR,
            userId: mockEditorUser.id,
          }),
        }),
      );
      expect(result.role).toBe(AssociationRole.EDITOR);
    });

    it("❌ Lève NotFoundException si l'email n'existe pas", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(42, { email: 'inconnu@test.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it("❌ Lève ConflictException si l'utilisateur est déjà membre", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockEditorUser);
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockEditorMember);

      await expect(
        service.addMember(42, { email: 'charlie@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ===========================================================================
  // updateMemberRole
  // ===========================================================================
  describe('updateMemberRole', () => {
    it('✅ Met à jour le rôle avec succès (EDITOR → ADMIN)', async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockEditorMember);
      mockPrisma.associationUser.update.mockResolvedValue({
        ...mockEditorMember,
        role: AssociationRole.ADMIN,
      });

      const result = await service.updateMemberRole(42, 12, {
        role: AssociationRole.ADMIN,
      });

      expect(mockPrisma.associationUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 12 },
          data: { role: AssociationRole.ADMIN },
        }),
      );
      expect(result.role).toBe(AssociationRole.ADMIN);
    });

    it('✅ Met à jour le rôle avec succès (ADMIN → EDITOR)', async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockAdminMember);
      mockPrisma.associationUser.update.mockResolvedValue({
        ...mockAdminMember,
        role: AssociationRole.EDITOR,
      });

      const result = await service.updateMemberRole(42, 11, {
        role: AssociationRole.EDITOR,
      });

      expect(result.role).toBe(AssociationRole.EDITOR);
    });

    it("❌ Lève ForbiddenException si on essaie de changer le rôle de l'OWNER", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockOwnerMember);

      await expect(
        service.updateMemberRole(42, 10, { role: AssociationRole.ADMIN }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('❌ Lève NotFoundException si le membre est introuvable', async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(42, 999, { role: AssociationRole.EDITOR }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // removeMember
  // ===========================================================================
  describe('removeMember', () => {
    it('✅ Retire un membre EDITOR avec succès', async () => {
      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(mockEditorMember)
        .mockResolvedValueOnce(mockOwnerMember);
      mockPrisma.associationUser.delete.mockResolvedValue(mockEditorMember);

      await service.removeMember(42, 12, mockUser1.id);

      expect(mockPrisma.associationUser.delete).toHaveBeenCalledWith({
        where: { id: 12 },
      });
    });

    it('✅ Retire un membre EDITOR par un ADMIN avec succès', async () => {
      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(mockEditorMember)
        .mockResolvedValueOnce(mockAdminMember);
      mockPrisma.associationUser.delete.mockResolvedValue(mockEditorMember);

      await service.removeMember(42, 12, mockUser2.id);

      expect(mockPrisma.associationUser.delete).toHaveBeenCalledWith({
        where: { id: 12 },
      });
    });

    it("❌ Lève ForbiddenException si on essaie de retirer l'OWNER", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockOwnerMember);

      await expect(service.removeMember(42, 10, mockUser1.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('❌ Lève ForbiddenException si un ADMIN essaie de retirer un autre ADMIN', async () => {
      const otherAdminMember = {
        id: 13,
        userId: 4,
        associationId: 42,
        role: AssociationRole.ADMIN,
        createdAt: new Date(),
        user: {
          firstName: 'Dave',
          lastName: 'Roy',
          email: 'd@test.com',
          profilePicture: null,
        },
      };

      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(otherAdminMember)
        .mockResolvedValueOnce({ ...mockAdminMember, userId: mockUser2.id });

      await expect(service.removeMember(42, 13, mockUser2.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('❌ Lève NotFoundException si le membre est introuvable', async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);

      await expect(service.removeMember(42, 999, mockUser1.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // transferOwner
  // ===========================================================================
  describe('transferOwner', () => {
    it('✅ Exécute la transaction (nouveau OWNER, ancien OWNER → ADMIN) et invalide les tokens', async () => {
      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(mockAdminMember)
        .mockResolvedValueOnce(mockOwnerMember);

      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.transferOwner(
        42,
        { newOwnerUserId: mockUser2.id },
        mockUser1.id,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser1.id },
      });
    });

    it("❌ Lève NotFoundException si l'utilisateur cible n'est pas membre", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);

      await expect(
        service.transferOwner(42, { newOwnerUserId: 999 }, mockUser1.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('❌ Lève BadRequestException si on se transfère la propriété à soi-même', async () => {
      await expect(
        service.transferOwner(
          42,
          { newOwnerUserId: mockUser1.id },
          mockUser1.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("❌ Lève NotFoundException si le membre demandeur (OWNER) n'est pas trouvé", async () => {
      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(mockAdminMember) // cible OK
        .mockResolvedValueOnce(null); // owner introuvable

      await expect(
        service.transferOwner(
          42,
          { newOwnerUserId: mockUser2.id },
          mockUser1.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
