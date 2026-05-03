import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminAssociationService } from './association.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { FILE_SERVICE } from '../../common/files/interfaces/file-service.interface';
import {
  AssociationStatus,
  AssociationRole,
  MissionStatus,
} from '../../generated/prisma/client';

type AnyFn = jest.Mock;

interface MockPrisma {
  association: {
    findMany: AnyFn;
    findUnique: AnyFn;
    findFirst: AnyFn;
    findUniqueOrThrow: AnyFn;
    count: AnyFn;
    create: AnyFn;
    update: AnyFn;
    delete: AnyFn;
  };
  associationUser: { findFirst: AnyFn };
  associationDocument: {
    findMany: AnyFn;
    findUnique: AnyFn;
    create: AnyFn;
    delete: AnyFn;
  };
  mission: {
    findMany: AnyFn;
    findUnique: AnyFn;
    findUniqueOrThrow: AnyFn;
    update: AnyFn;
    updateMany: AnyFn;
  };
  user: { findUnique: AnyFn };
  $transaction: AnyFn;
}

const buildPrismaMock = (): MockPrisma => ({
  association: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  associationUser: { findFirst: jest.fn() },
  associationDocument: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  mission: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
});

const mockMail = {
  sendAssociationValidatedEmail: jest.fn().mockResolvedValue(undefined),
  sendAssociationRejectedEmail: jest.fn().mockResolvedValue(undefined),
  sendAssociationSuspendedEmail: jest.fn().mockResolvedValue(undefined),
  sendAssociationPurgedEmail: jest.fn().mockResolvedValue(undefined),
  sendAssociationDocumentsRequestEmail: jest.fn().mockResolvedValue(undefined),
  sendMissionCancelledEmail: jest.fn().mockResolvedValue(undefined),
};

const mockFileService = {
  uploadFile: jest.fn().mockResolvedValue({
    publicId: 'mock-public-id',
    url: 'https://mock/url.pdf',
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFileForDownload: jest
    .fn()
    .mockResolvedValue({ type: 'redirect', url: 'https://mock/url.pdf' }),
};

const mockConfig = {
  get: jest.fn((key: string): string | undefined => {
    if (key === 'CONTACT_ADMIN_EMAIL') return 'contact@giveaway.fr';
    return undefined;
  }),
};

describe('AdminAssociationService', () => {
  let service: AdminAssociationService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAssociationService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
        { provide: FILE_SERVICE, useValue: mockFileService },
      ],
    }).compile();

    service = module.get(AdminAssociationService);
  });

  // ---------------------------------------------------------------- listPending
  describe('listPending', () => {
    it('retourne les assos PENDING paginées', async () => {
      prisma.association.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.association.count.mockResolvedValue(1);

      const res = await service.listPending(2, 10);
      expect(res).toEqual({ items: [{ id: 1 }], total: 1, page: 2, limit: 10 });
      expect(prisma.association.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: AssociationStatus.PENDING },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  // ---------------------------------------------------------------- list
  describe('list', () => {
    it('applique status + recherche (name/siret/rna)', async () => {
      prisma.association.findMany.mockResolvedValue([]);
      prisma.association.count.mockResolvedValue(0);

      await service.list({
        search: 'foo',
        status: AssociationStatus.VALIDATED,
      });

      const arg = prisma.association.findMany.mock.calls[0][0];
      expect(arg.where.status).toBe(AssociationStatus.VALIDATED);
      expect(arg.where.OR).toEqual([
        { name: { contains: 'foo', mode: 'insensitive' } },
        { siret: { contains: 'foo', mode: 'insensitive' } },
        { rna: { contains: 'foo', mode: 'insensitive' } },
      ]);
      expect(arg.skip).toBe(0);
      expect(arg.take).toBe(20);
    });

    it('utilise les valeurs par défaut page=1 limit=20', async () => {
      prisma.association.findMany.mockResolvedValue([]);
      prisma.association.count.mockResolvedValue(0);
      const res = await service.list({});
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
    });
  });

  // ---------------------------------------------------------------- getById
  describe('getById', () => {
    it('retourne l’association', async () => {
      prisma.association.findUnique.mockResolvedValue({ id: 5 });
      const res = await service.getById(5);
      expect(res).toEqual({ id: 5 });
    });

    it('throw NotFound si introuvable', async () => {
      prisma.association.findUnique.mockResolvedValue(null);
      await expect(service.getById(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------- validate
  describe('validate', () => {
    it('valide une asso PENDING + envoie email', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'Asso',
        status: AssociationStatus.PENDING,
      });
      prisma.association.update.mockResolvedValue({
        id: 1,
        status: AssociationStatus.VALIDATED,
      });
      prisma.associationUser.findFirst.mockResolvedValue({
        user: { email: 'owner@x.fr' },
      });

      const res = await service.validate(1);
      expect(res.status).toBe(AssociationStatus.VALIDATED);
      expect(prisma.association.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: AssociationStatus.VALIDATED, rejectionReason: null },
      });
      expect(mockMail.sendAssociationValidatedEmail).toHaveBeenCalledWith(
        'owner@x.fr',
        'Asso',
      );
    });

    it('valide une asso REJECTED (re-validation)', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'Asso',
        status: AssociationStatus.REJECTED,
      });
      prisma.association.update.mockResolvedValue({ id: 1 });
      prisma.associationUser.findFirst.mockResolvedValue(null);

      await expect(service.validate(1)).resolves.toBeDefined();
      expect(mockMail.sendAssociationValidatedEmail).not.toHaveBeenCalled();
    });

    it('rejette si statut VALIDATED ou SUSPENDED', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'X',
        status: AssociationStatus.SUSPENDED,
      });
      await expect(service.validate(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------- reject
  describe('reject', () => {
    it('met REJECTED + envoie email', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'A',
      });
      prisma.association.update.mockResolvedValue({
        id: 1,
        status: AssociationStatus.REJECTED,
      });
      prisma.associationUser.findFirst.mockResolvedValue({
        user: { email: 'o@x.fr' },
      });

      await service.reject(1, 'raison valide');
      expect(prisma.association.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: AssociationStatus.REJECTED,
          rejectionReason: 'raison valide',
        },
      });
      expect(mockMail.sendAssociationRejectedEmail).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- purge
  describe('purge', () => {
    it('throw NotFound si asso absente', async () => {
      prisma.association.findUnique.mockResolvedValue(null);
      await expect(service.purge(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throw BadRequest si asso pas en REJECTED', async () => {
      prisma.association.findUnique.mockResolvedValue({
        id: 1,
        status: AssociationStatus.VALIDATED,
        documents: [],
        members: [],
        rejectionReason: null,
      });
      await expect(service.purge(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('supprime asso, fichiers (best-effort) et envoie email purge', async () => {
      prisma.association.findUnique.mockResolvedValue({
        id: 1,
        name: 'Asso X',
        status: AssociationStatus.REJECTED,
        rejectionReason: 'doc invalide',
        documents: [{ fileUrl: 'pid-1' }, { fileUrl: 'pid-2' }],
        members: [{ user: { email: 'o@x.fr', firstName: 'Owen' } }],
      });
      prisma.association.delete.mockResolvedValue({ id: 1 });

      const res = await service.purge(1);
      expect(res).toEqual({
        deleted: true,
        message: 'Association supprimée définitivement',
      });
      expect(prisma.association.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockFileService.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockMail.sendAssociationPurgedEmail).toHaveBeenCalledWith(
        'o@x.fr',
        'Asso X',
        'doc invalide',
      );
    });
  });

  // ---------------------------------------------------------------- suspend
  describe('suspend', () => {
    it('passe en SUSPENDED + archive missions actives', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'A',
      });
      prisma.$transaction.mockImplementation(() =>
        Promise.resolve([
          { id: 1, status: AssociationStatus.SUSPENDED },
          { count: 3 },
        ]),
      );
      prisma.associationUser.findFirst.mockResolvedValue({
        user: { email: 'o@x.fr' },
      });

      const res = await service.suspend(1, 'motif suffisamment long');
      expect(res.status).toBe(AssociationStatus.SUSPENDED);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockMail.sendAssociationSuspendedEmail).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- reactivate
  describe('reactivate', () => {
    it('throw BadRequest si pas SUSPENDED', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        status: AssociationStatus.VALIDATED,
      });
      await expect(service.reactivate(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('réactive et restaure missions ARCHIVED → ACTIVE', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        status: AssociationStatus.SUSPENDED,
      });
      prisma.$transaction.mockResolvedValue([
        { id: 1, status: AssociationStatus.VALIDATED },
        { count: 2 },
      ]);
      const res = await service.reactivate(1);
      expect(res.status).toBe(AssociationStatus.VALIDATED);
    });
  });

  // ---------------------------------------------------------------- requestDocuments
  describe('requestDocuments', () => {
    it('throw BadRequest si aucun owner', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'A',
      });
      prisma.associationUser.findFirst.mockResolvedValue(null);
      await expect(
        service.requestDocuments(1, ['STATUTS']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('appelle MailService avec contact admin par défaut', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'A',
      });
      prisma.associationUser.findFirst.mockResolvedValue({
        user: { email: 'o@x.fr' },
      });
      const res = await service.requestDocuments(1, ['STATUTS'], 'msg');
      expect(res).toEqual({ sent: true });
      expect(
        mockMail.sendAssociationDocumentsRequestEmail,
      ).toHaveBeenCalledWith(
        'o@x.fr',
        'A',
        ['STATUTS'],
        'msg',
        'contact@giveaway.fr',
      );
    });
  });

  // ---------------------------------------------------------------- uploadDocument
  describe('uploadDocument', () => {
    it('upload + persist en base', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({ id: 1 });
      prisma.associationDocument.create.mockResolvedValue({
        id: 99,
        type: 'STATUTS',
        fileUrl: 'mock-public-id',
      });

      const file = {
        buffer: Buffer.from(''),
        originalname: 'a.pdf',
      } as unknown as Express.Multer.File;
      const res = await service.uploadDocument(1, 'STATUTS', file);
      expect(res.id).toBe(99);
      expect(mockFileService.uploadFile).toHaveBeenCalledWith(
        file,
        'association-documents',
      );
      expect(prisma.associationDocument.create).toHaveBeenCalledWith({
        data: {
          associationId: 1,
          fileUrl: 'mock-public-id',
          type: 'STATUTS',
        },
      });
    });
  });

  // ---------------------------------------------------------------- deleteDocument
  describe('deleteDocument', () => {
    it('throw NotFound si document absent', async () => {
      prisma.associationDocument.findUnique.mockResolvedValue(null);
      await expect(service.deleteDocument(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('supprime et appelle fileService (best-effort)', async () => {
      prisma.associationDocument.findUnique.mockResolvedValue({
        id: 1,
        fileUrl: 'pid-x',
      });
      prisma.associationDocument.delete.mockResolvedValue({ id: 1 });
      const res = await service.deleteDocument(1);
      expect(res).toEqual({ deleted: true });
      expect(mockFileService.deleteFile).toHaveBeenCalledWith('pid-x');
    });
  });

  // ---------------------------------------------------------------- getDocumentForDownload
  describe('getDocumentForDownload', () => {
    it('throw NotFound si document absent', async () => {
      prisma.associationDocument.findUnique.mockResolvedValue(null);
      await expect(service.getDocumentForDownload(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('délègue au fileService', async () => {
      prisma.associationDocument.findUnique.mockResolvedValue({
        id: 1,
        fileUrl: 'pid-1',
      });
      const res = await service.getDocumentForDownload(1);
      expect(res).toEqual({ type: 'redirect', url: 'https://mock/url.pdf' });
      expect(mockFileService.getFileForDownload).toHaveBeenCalledWith('pid-1');
    });
  });

  // ---------------------------------------------------------------- getMissionById / deleteMission
  describe('getMissionById', () => {
    it('throw NotFound si mission absente', async () => {
      prisma.mission.findUnique.mockResolvedValue(null);
      await expect(service.getMissionById(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deleteMission', () => {
    it('throw BadRequest si mission DELETED', async () => {
      prisma.mission.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        status: MissionStatus.DELETED,
        title: 'M',
        association: { name: 'A' },
        participants: [],
      });
      await expect(service.deleteMission(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('passe la mission en DELETED + notifie participants', async () => {
      prisma.mission.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        status: MissionStatus.ACTIVE,
        title: 'Mission X',
        association: { name: 'Asso' },
        participants: [
          { user: { email: 'p1@x.fr', firstName: 'P1' } },
          { user: { email: 'p2@x.fr', firstName: 'P2' } },
        ],
      });
      prisma.mission.update.mockResolvedValue({ id: 1 });
      const res = await service.deleteMission(1, 'raison');
      expect(res).toEqual({ deleted: true });
      expect(prisma.mission.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: MissionStatus.DELETED },
      });
      expect(mockMail.sendMissionCancelledEmail).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------- create
  describe('create', () => {
    it('throw BadRequest si owner introuvable', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ name: 'A', ownerUserId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throw Conflict si SIRET déjà actif', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.association.findFirst.mockResolvedValue({
        name: 'Existing',
        status: AssociationStatus.VALIDATED,
      });
      await expect(
        service.create({ name: 'A', ownerUserId: 1, siret: '12345678900000' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée l’association VALIDATED avec OWNER', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.association.findFirst.mockResolvedValue(null);
      prisma.association.create.mockResolvedValue({ id: 42 });

      const res = await service.create({
        name: 'Nouvelle Asso',
        ownerUserId: 1,
        rna: 'W12345',
        website: '',
      });
      expect(res.id).toBe(42);
      const arg = prisma.association.create.mock.calls[0][0];
      expect(arg.data.status).toBe(AssociationStatus.VALIDATED);
      expect(arg.data.members).toEqual({
        create: { userId: 1, role: AssociationRole.OWNER },
      });
      // website: '' est converti en undefined
      expect(arg.data.website).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------- update
  describe('update', () => {
    it('throw NotFound si asso absente', async () => {
      prisma.association.findUniqueOrThrow.mockRejectedValue(
        new NotFoundException(),
      );
      await expect(service.update(1, { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throw Conflict si doublon (siret) sur autre asso', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({ id: 1 });
      prisma.association.findFirst.mockResolvedValue({
        name: 'Other',
        status: AssociationStatus.PENDING,
      });
      await expect(
        service.update(1, { siret: '12345678900000' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('convertit chaîne vide en null et exclut champs inconnus', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({ id: 1 });
      prisma.association.findFirst.mockResolvedValue(null);
      prisma.association.update.mockResolvedValue({ id: 1 });

      await service.update(1, {
        name: 'Updated',
        website: '',
        unknownField: 'x',
      } as Record<string, unknown>);

      const arg = prisma.association.update.mock.calls[0][0];
      expect(arg.data.name).toBe('Updated');
      expect(arg.data.website).toBeNull();
      expect(arg.data).not.toHaveProperty('unknownField');
    });
  });

  // ---------------------------------------------------------------- delete
  describe('delete', () => {
    it('passe asso SUSPENDED + missions DELETED + notifie participants', async () => {
      prisma.association.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'Asso',
      });
      prisma.mission.findMany.mockResolvedValue([
        {
          id: 10,
          title: 'M1',
          participants: [{ user: { email: 'p@x.fr', firstName: 'P' } }],
        },
        {
          id: 11,
          title: 'M2',
          participants: [],
        },
      ]);
      prisma.$transaction.mockResolvedValue([{ count: 2 }, { id: 1 }]);

      const res = await service.delete(1, 'motif');
      expect(res).toEqual({ deleted: true, missionsAffected: 2 });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockMail.sendMissionCancelledEmail).toHaveBeenCalledTimes(1);
    });
  });
});
