import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssociationService } from './association.service';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { ConversationService } from '../messaging/conversation.service';
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

const mockDocument = {
  id: 5,
  fileUrl: 'association-documents/mock-doc-id',
  type: 'PDF',
  createdAt: new Date('2024-01-01'),
  associationId: 42,
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

const mockAssociationWithDoc = {
  ...mockAssociation,
  documents: [mockDocument],
};

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockPrisma = {
  association: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  associationUser: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  associationDocument: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  conversation: {
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  mission: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

const mockFileService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileForDownload: jest.fn(),
};

// ----------------------------------------------------------------
// Suite de tests
// ----------------------------------------------------------------

const mockConversationService = {
  deleteConversationsAndNotify: jest
    .fn()
    .mockResolvedValue({ deletedCount: 0, notifiedUserIds: [] }),
};

describe('AssociationService', () => {
  let service: AssociationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FILE_SERVICE, useValue: mockFileService },
        { provide: ConversationService, useValue: mockConversationService },
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
      expect(typeof owner?.createdAt).toBe('string');
    });

    it("✅ Retourne null pour l'adresse si elle est absente", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        ...mockAssociation,
        address: null,
      });

      const result = await service.getAssociation(42);
      expect(result.address).toBeNull();
    });

    it('✅ Mappe correctement les documents', async () => {
      mockPrisma.association.findUnique.mockResolvedValue(
        mockAssociationWithDoc,
      );

      const result = await service.getAssociation(42);

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].id).toBe(5);
      expect(result.documents[0].type).toBe('PDF');
    });

    it('✅ Convertit latitude/longitude Decimal en number', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        ...mockAssociation,
        address: { ...mockAddress, latitude: '48.85', longitude: '2.35' },
      });

      const result = await service.getAssociation(42);

      expect(result.address?.latitude).toBe(48.85);
      expect(result.address?.longitude).toBe(2.35);
      expect(typeof result.address?.latitude).toBe('number');
    });
  });

  // ===========================================================================
  // getAssociationMissions
  // ===========================================================================
  describe('getAssociationMissions', () => {
    const makePrismaMission = () => ({
      id: 1,
      title: 'Mission Test',
      description: 'Description',
      type: 'MISSION',
      hasRegistration: true,
      volunteersNeeded: 5,
      durationInt: 120,
      frequency: 'ONCE',
      startDate: new Date('2026-06-01'),
      endDate: null,
      createdAt: new Date(),
      associationId: 42,
      association: { name: 'Les Amis du Quartier' },
      address: null,
      causes: [{ cause: { id: 1, label: 'Aide alimentaire' } }],
      volunteerTypes: [{ volunteerType: { id: 1, label: 'Ouvert à tous' } }],
    });

    it('✅ Retourne la liste paginée des missions avec les relations aplaties', async () => {
      const rawMissions = [makePrismaMission()];
      mockPrisma.$transaction.mockImplementation(
        (queries: Promise<unknown>[]) => Promise.all(queries),
      );
      mockPrisma.mission.findMany.mockResolvedValue(rawMissions);
      mockPrisma.mission.count.mockResolvedValue(1);

      const result = await service.getAssociationMissions(42, 1, 3);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);
      expect(result.totalPages).toBe(1);
      expect(result.missions).toHaveLength(1);
    });

    it('✅ Aplatit les causes et volunteerTypes depuis les pivots', async () => {
      const rawMissions = [makePrismaMission()];
      mockPrisma.$transaction.mockImplementation(
        (queries: Promise<unknown>[]) => Promise.all(queries),
      );
      mockPrisma.mission.findMany.mockResolvedValue(rawMissions);
      mockPrisma.mission.count.mockResolvedValue(1);

      const result = await service.getAssociationMissions(42, 1, 3);

      expect(result.missions[0].causes).toEqual([
        { id: 1, label: 'Aide alimentaire' },
      ]);
      expect(result.missions[0].volunteerTypes).toEqual([
        { id: 1, label: 'Ouvert à tous' },
      ]);
    });

    it('✅ Retourne un résultat vide si aucune mission', async () => {
      mockPrisma.$transaction.mockImplementation(
        (queries: Promise<unknown>[]) => Promise.all(queries),
      );
      mockPrisma.mission.findMany.mockResolvedValue([]);
      mockPrisma.mission.count.mockResolvedValue(0);

      const result = await service.getAssociationMissions(42, 1, 3);

      expect(result.missions).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('✅ Calcule correctement skip selon la page', async () => {
      mockPrisma.$transaction.mockImplementation(
        (queries: Promise<unknown>[]) => Promise.all(queries),
      );
      mockPrisma.mission.findMany.mockResolvedValue([]);
      mockPrisma.mission.count.mockResolvedValue(0);

      await service.getAssociationMissions(42, 3, 5);

      expect(mockPrisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });
  });

  // ===========================================================================
  // updateAssociation
  // ===========================================================================
  describe('updateAssociation', () => {
    it('✅ Met à jour les champs scalaires sans appel au service de fichiers', async () => {
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(mockAssociation)
        .mockResolvedValueOnce(mockAssociation);

      await service.updateAssociation(42, {
        description: 'Nouvelle description',
      });

      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
      expect(mockFileService.deleteFile).not.toHaveBeenCalled();
      expect(mockPrisma.association.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
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

      await service.updateAssociation(42, {
        address: {
          street: '5 avenue de la Liberté',
          postalCode: '69001',
          city: 'Lyon',
        },
      });

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

    it("✅ Upload le nouveau logo et supprime l'ancien si un fichier est fourni", async () => {
      const existingWithLogo = { ...mockAssociation, logoUrl: 'old-logo-id' };
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(existingWithLogo)
        .mockResolvedValueOnce(mockAssociation);

      mockFileService.uploadFile.mockResolvedValue({
        publicId: 'new-logo-id',
        url: 'https://cdn/new-logo.jpg',
      });
      mockFileService.deleteFile.mockResolvedValue(undefined);

      const logoFile = {
        buffer: Buffer.from('img'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      await service.updateAssociation(42, {}, logoFile);

      expect(mockFileService.uploadFile).toHaveBeenCalledWith(
        logoFile,
        'association-logos',
      );
      expect(mockPrisma.association.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ logoUrl: 'new-logo-id' }),
        }),
      );
    });

    it('✅ Efface le logo quand dto.logoUrl est une chaîne vide (suppression explicite)', async () => {
      const existingWithLogo = { ...mockAssociation, logoUrl: 'old-logo-id' };
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(existingWithLogo)
        .mockResolvedValueOnce(mockAssociation);
      mockFileService.deleteFile.mockResolvedValue(undefined);

      await service.updateAssociation(42, { logoUrl: '' });

      expect(mockFileService.deleteFile).toHaveBeenCalledWith('old-logo-id');
      expect(mockPrisma.association.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ logoUrl: null }),
        }),
      );
    });

    it('✅ Supprime les documents retirés de dto.documentUrls', async () => {
      const existingWithDocs = {
        ...mockAssociation,
        documents: [mockDocument],
      };
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(existingWithDocs)
        .mockResolvedValueOnce(mockAssociation);
      mockFileService.deleteFile.mockResolvedValue(undefined);
      mockPrisma.associationDocument.deleteMany.mockResolvedValue({ count: 1 });

      // Passer une liste vide = supprimer tous les documents existants
      await service.updateAssociation(42, { documentUrls: [] });

      expect(mockPrisma.associationDocument.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [mockDocument.id] } },
      });
    });

    it("❌ Lève NotFoundException quand l'association est introuvable", async () => {
      mockPrisma.association.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAssociation(42, { name: 'Nouveau nom' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.association.update).not.toHaveBeenCalled();
    });

    it('✅ Ne supprime pas les documents conservés dans dto.documentUrls', async () => {
      const existingWithDocs = {
        ...mockAssociation,
        documents: [mockDocument],
      };
      mockPrisma.association.findUnique
        .mockResolvedValueOnce(existingWithDocs)
        .mockResolvedValueOnce(mockAssociation);

      // Garder le document existant
      await service.updateAssociation(42, {
        documentUrls: [mockDocument.fileUrl],
      });

      expect(mockPrisma.associationDocument.deleteMany).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getDocumentForDownload
  // ===========================================================================
  describe('getDocumentForDownload', () => {
    it('✅ Retourne le résultat du service de fichiers pour un document valide', async () => {
      mockPrisma.associationDocument.findFirst.mockResolvedValue(mockDocument);
      const downloadResult = {
        type: 'redirect' as const,
        url: 'https://cdn.example.com/doc.pdf',
      };
      mockFileService.getFileForDownload.mockResolvedValue(downloadResult);

      const result = await service.getDocumentForDownload(42, 5);

      expect(mockPrisma.associationDocument.findFirst).toHaveBeenCalledWith({
        where: { id: 5, associationId: 42 },
      });
      expect(mockFileService.getFileForDownload).toHaveBeenCalledWith(
        mockDocument.fileUrl,
      );
      expect(result).toEqual(downloadResult);
    });

    it('❌ Lève NotFoundException si le document est introuvable', async () => {
      mockPrisma.associationDocument.findFirst.mockResolvedValue(null);

      await expect(service.getDocumentForDownload(42, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFileService.getFileForDownload).not.toHaveBeenCalled();
    });

    it('❌ Lève NotFoundException si le document appartient à une autre association', async () => {
      // findFirst retourne null car le where inclut associationId
      mockPrisma.associationDocument.findFirst.mockResolvedValue(null);

      await expect(service.getDocumentForDownload(99, 5)).rejects.toThrow(
        NotFoundException,
      );
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
  // getContactableMembers
  // ===========================================================================
  describe('getContactableMembers', () => {
    it("✅ Retourne les membres mappés sans l'email", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.associationUser.findMany.mockResolvedValue([
        mockOwnerMember,
        mockAdminMember,
      ]);

      const result = await service.getContactableMembers(42, 999);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: mockUser1.id,
        firstName: mockUser1.firstName,
        lastName: mockUser1.lastName,
        profilePicture: mockUser1.profilePicture,
        role: AssociationRole.OWNER,
      });
      // L'email ne doit pas se retrouver dans le payload public
      expect(result[0]).not.toHaveProperty('email');
    });

    it('✅ Filtre le user courant et les inactifs côté SQL', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.associationUser.findMany.mockResolvedValue([]);

      await service.getContactableMembers(42, mockUser1.id);

      expect(mockPrisma.associationUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            associationId: 42,
            userId: { not: mockUser1.id },
            user: { status: 'ACTIVE' },
          }),
        }),
      );
    });

    it("❌ NotFoundException si l'asso n'existe pas", async () => {
      mockPrisma.association.findUnique.mockResolvedValue(null);
      await expect(service.getContactableMembers(42, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("❌ ForbiddenException si l'asso n'est pas VALIDATED", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.PENDING,
      });
      await expect(service.getContactableMembers(42, 1)).rejects.toThrow(
        ForbiddenException,
      );
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

      const result = await service.addMember(42, { email: 'charlie@test.com' });

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

    it("❌ Lève ConflictException si l'utilisateur est déjà membre de cette association", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockEditorUser);
      mockPrisma.associationUser.findFirst.mockResolvedValue({
        ...mockEditorMember,
        associationId: 42,
        association: { id: 42, name: 'Les Amis du Quartier' },
      });

      await expect(
        service.addMember(42, { email: 'charlie@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it("❌ Lève ConflictException si l'utilisateur est déjà membre d'une autre association", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockEditorUser);
      mockPrisma.associationUser.findFirst.mockResolvedValue({
        ...mockEditorMember,
        associationId: 99,
        association: { id: 99, name: 'Autre Association' },
      });

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
    it('✅ Retire un membre EDITOR avec succès (par un OWNER) + notifie+supprime les conversations liées', async () => {
      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(mockEditorMember)
        .mockResolvedValueOnce(mockOwnerMember);
      mockPrisma.associationUser.delete.mockResolvedValue(mockEditorMember);

      await service.removeMember(42, 12, mockUser1.id);

      expect(
        mockConversationService.deleteConversationsAndNotify,
      ).toHaveBeenCalledWith({
        where: { associationId: 42, associationMemberId: mockEditorUser.id },
        reason: 'member_left',
        excludedUserId: mockEditorUser.id,
      });
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
  // leaveAssociation
  // ===========================================================================
  describe('leaveAssociation', () => {
    it("✅ Permet à un EDITOR de quitter l'association + notifie+supprime les conversations liées", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockEditorMember);
      mockPrisma.associationUser.delete.mockResolvedValue(mockEditorMember);

      await service.leaveAssociation(42, mockEditorUser.id);

      expect(
        mockConversationService.deleteConversationsAndNotify,
      ).toHaveBeenCalledWith({
        where: { associationId: 42, associationMemberId: mockEditorUser.id },
        reason: 'member_left',
        excludedUserId: mockEditorUser.id,
      });
      expect(mockPrisma.associationUser.delete).toHaveBeenCalledWith({
        where: { id: mockEditorMember.id },
      });
    });

    it("✅ Permet à un ADMIN de quitter l'association", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockAdminMember);
      mockPrisma.associationUser.delete.mockResolvedValue(mockAdminMember);

      await service.leaveAssociation(42, mockUser2.id);

      expect(mockPrisma.associationUser.delete).toHaveBeenCalledWith({
        where: { id: mockAdminMember.id },
      });
    });

    it("❌ Lève ForbiddenException si l'OWNER tente de quitter", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(mockOwnerMember);

      await expect(service.leaveAssociation(42, mockUser1.id)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.associationUser.delete).not.toHaveBeenCalled();
    });

    it("❌ Lève NotFoundException si l'utilisateur n'est pas membre", async () => {
      mockPrisma.associationUser.findFirst.mockResolvedValue(null);

      await expect(service.leaveAssociation(42, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // transferOwner
  // ===========================================================================
  describe('transferOwner', () => {
    it('✅ Exécute la transaction atomique (nouveau OWNER, ancien OWNER → ADMIN)', async () => {
      mockPrisma.associationUser.findFirst
        .mockResolvedValueOnce(mockAdminMember) // cible (futur owner)
        .mockResolvedValueOnce(mockOwnerMember); // requérant (owner actuel)

      mockPrisma.$transaction.mockResolvedValue([]);

      await service.transferOwner(
        42,
        { newOwnerUserId: mockUser2.id },
        mockUser1.id,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
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

      // Aucune requête DB ne doit être exécutée avant ce check
      expect(mockPrisma.associationUser.findFirst).not.toHaveBeenCalled();
    });

    it('❌ Lève NotFoundException si le membre demandeur (OWNER) est introuvable', async () => {
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

  // ===========================================================================
  // findPublicList
  // ===========================================================================
  describe('findPublicList', () => {
    const makeRawAssociation = (overrides = {}) => ({
      id: 1,
      name: 'Croix-Rouge Paris',
      description: 'Association humanitaire',
      logoUrl: null,
      website: null,
      address: { city: 'Paris' },
      category: { name: 'Humanitaire' },
      _count: { missions: 3 },
      ...overrides,
    });

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(
        (queries: Promise<unknown>[]) => Promise.all(queries),
      );
    });

    it('✅ Retourne une liste paginée avec les champs mappés', async () => {
      mockPrisma.association.findMany.mockResolvedValue([makeRawAssociation()]);
      mockPrisma.association.count.mockResolvedValue(1);

      const result = await service.findPublicList();

      expect(result.associations).toHaveLength(1);
      expect(result.associations[0].id).toBe(1);
      expect(result.associations[0].name).toBe('Croix-Rouge Paris');
      expect(result.associations[0].category).toBe('Humanitaire');
      expect(result.associations[0].city).toBe('Paris');
      expect(result.associations[0].activeMissionsCount).toBe(3);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(12);
    });

    it('✅ Retourne un résultat vide si aucune association validée', async () => {
      mockPrisma.association.findMany.mockResolvedValue([]);
      mockPrisma.association.count.mockResolvedValue(0);

      const result = await service.findPublicList();

      expect(result.associations).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('✅ Filtre par nom (search insensible à la casse)', async () => {
      mockPrisma.association.findMany.mockResolvedValue([]);
      mockPrisma.association.count.mockResolvedValue(0);

      await service.findPublicList('croix');

      const callArgs = mockPrisma.association.findMany.mock.calls[0][0];
      expect(callArgs.where.name).toEqual({
        contains: 'croix',
        mode: 'insensitive',
      });
    });

    it('✅ Filtre par ville (city insensible à la casse)', async () => {
      mockPrisma.association.findMany.mockResolvedValue([]);
      mockPrisma.association.count.mockResolvedValue(0);

      await service.findPublicList(undefined, 'paris');

      const callArgs = mockPrisma.association.findMany.mock.calls[0][0];
      expect(callArgs.where.address).toEqual({
        city: { contains: 'paris', mode: 'insensitive' },
      });
    });

    it('✅ Filtre par rayon géographique en appelant $queryRaw', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.association.findMany.mockResolvedValue([]);
      mockPrisma.association.count.mockResolvedValue(0);

      await service.findPublicList(undefined, undefined, 48.85, 2.35, 10);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.association.findMany.mock.calls[0][0];
      expect(callArgs.where.id).toEqual({ in: [1, 2] });
    });

    it('✅ Retourne null pour category et city si relations absentes', async () => {
      const raw = { ...makeRawAssociation(), category: null, address: null };
      mockPrisma.association.findMany.mockResolvedValue([raw]);
      mockPrisma.association.count.mockResolvedValue(1);

      const result = await service.findPublicList();

      expect(result.associations[0].category).toBeNull();
      expect(result.associations[0].city).toBeNull();
    });

    it('✅ Calcule correctement le skip selon la page', async () => {
      mockPrisma.association.findMany.mockResolvedValue([]);
      mockPrisma.association.count.mockResolvedValue(0);

      await service.findPublicList(
        undefined,
        undefined,
        undefined,
        undefined,
        10,
        3,
        6,
      );

      const callArgs = mockPrisma.association.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(12); // (3-1) * 6
      expect(callArgs.take).toBe(6);
    });
  });

  // ===========================================================================
  // findPublicProfile
  // ===========================================================================
  describe('findPublicProfile', () => {
    const makePublicAssociation = (overrides = {}) => ({
      id: 42,
      name: 'Les Restos du Cœur',
      description: 'Aide alimentaire',
      object: 'Objet statutaire',
      legalStatus: 'Association loi 1901',
      logoUrl: null,
      website: null,
      phone: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      address: {
        id: 1,
        street: '10 rue de la Paix',
        postalCode: '75001',
        city: 'Paris',
        latitude: '48.85',
        longitude: '2.35',
      },
      category: { name: 'Aide alimentaire' },
      _count: { missions: 5 },
      ...overrides,
    });

    it('✅ Retourne le profil public avec tous les champs mappés', async () => {
      mockPrisma.association.findFirst.mockResolvedValue(
        makePublicAssociation(),
      );

      const result = await service.findPublicProfile(42);

      expect(result.id).toBe(42);
      expect(result.name).toBe('Les Restos du Cœur');
      expect(result.category).toBe('Aide alimentaire');
      expect(result.address?.city).toBe('Paris');
      expect(result.address?.latitude).toBe(48.85);
      expect(result.address?.longitude).toBe(2.35);
      expect(typeof result.address?.latitude).toBe('number');
      expect(result.activeMissionsCount).toBe(5);
    });

    it("❌ Lève NotFoundException si l'association est introuvable ou non validée", async () => {
      mockPrisma.association.findFirst.mockResolvedValue(null);

      await expect(service.findPublicProfile(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('✅ Recherche uniquement les associations avec status VALIDATED', async () => {
      mockPrisma.association.findFirst.mockResolvedValue(
        makePublicAssociation(),
      );

      await service.findPublicProfile(42);

      const callArgs = mockPrisma.association.findFirst.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({ id: 42, status: 'VALIDATED' });
    });

    it('✅ Retourne null pour address si absente', async () => {
      mockPrisma.association.findFirst.mockResolvedValue(
        makePublicAssociation({ address: null }),
      );

      const result = await service.findPublicProfile(42);

      expect(result.address).toBeNull();
    });

    it('✅ Retourne null pour category si absente', async () => {
      mockPrisma.association.findFirst.mockResolvedValue(
        makePublicAssociation({ category: null }),
      );

      const result = await service.findPublicProfile(42);

      expect(result.category).toBeNull();
    });

    it('✅ Retourne createdAt en string ISO', async () => {
      mockPrisma.association.findFirst.mockResolvedValue(
        makePublicAssociation(),
      );

      const result = await service.findPublicProfile(42);

      expect(typeof result.createdAt).toBe('string');
    });
  });

  // ===========================================================================
  // findNearby
  // ===========================================================================
  describe('findNearby', () => {
    const nearbyQuery = {
      lat: 48.85,
      lng: 2.35,
      radius: 10,
      limit: 200,
    };

    const mockMapItems = [
      {
        id: 42,
        name: 'Les Amis du Quartier',
        logoUrl: null,
        city: 'Paris',
        latitude: 48.85,
        longitude: 2.35,
        description: null,
        website: null,
        category: null,
      },
    ];

    it('✅ Retourne les associations dans le rayon', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(mockMapItems);

      const result = await service.findNearby(nearbyQuery);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMapItems);
    });

    it('✅ Retourne un tableau vide si aucune association dans le rayon', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findNearby(nearbyQuery);

      expect(result).toEqual([]);
    });

    it('✅ Gère les filtres optionnels (categoryIds, createdAfter, createdBefore)', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.findNearby({
        ...nearbyQuery,
        categoryIds: [1, 2],
        createdAfter: new Date('2024-01-01'),
        createdBefore: new Date('2025-01-01'),
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('✅ Retourne plusieurs associations triées par distance', async () => {
      const multipleItems = [
        { ...mockMapItems[0], id: 1, latitude: 48.85, longitude: 2.35 },
        { ...mockMapItems[0], id: 2, latitude: 48.86, longitude: 2.36 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(multipleItems);

      const result = await service.findNearby(nearbyQuery);

      expect(result).toHaveLength(2);
    });
  });
});
