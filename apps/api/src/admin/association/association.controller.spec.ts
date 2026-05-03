import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { AdminAssociationController } from './association.controller';
import { AdminAssociationService } from './association.service';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';

jest.mock('../../common/pipes/documents-validation.pipe', () => ({
  DocumentsValidationPipe: jest.fn().mockImplementation(() => ({
    transform: jest.fn().mockReturnValue([]),
  })),
}));

const mockService = {
  listPending: jest.fn(),
  list: jest.fn(),
  getById: jest.fn(),
  listDocuments: jest.fn(),
  getDocumentForDownload: jest.fn(),
  validate: jest.fn(),
  reject: jest.fn(),
  suspend: jest.fn(),
  reactivate: jest.fn(),
  uploadDocument: jest.fn(),
  deleteDocument: jest.fn(),
  requestDocuments: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  getMissionById: jest.fn(),
  deleteMission: jest.fn(),
  delete: jest.fn(),
  purge: jest.fn(),
};

const buildRes = () => {
  const res = {
    redirect: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;
  return res;
};

describe('AdminAssociationController', () => {
  let controller: AdminAssociationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAssociationController],
      providers: [{ provide: AdminAssociationService, useValue: mockService }],
    })
      .overrideInterceptor(AdminLogInterceptor)
      .useValue({
        intercept: (_ctx: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .compile();

    controller = module.get(AdminAssociationController);
  });

  describe('pending', () => {
    it('appelle service.listPending avec valeurs par défaut', async () => {
      mockService.listPending.mockResolvedValue({ items: [], total: 0 });
      await controller.pending();
      expect(mockService.listPending).toHaveBeenCalledWith(1, 20);
    });

    it('parse les paramètres page et limit', async () => {
      mockService.listPending.mockResolvedValue({ items: [], total: 0 });
      await controller.pending('2', '10');
      expect(mockService.listPending).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('list', () => {
    it('appelle service.list avec les paramètres par défaut', async () => {
      mockService.list.mockResolvedValue({ items: [], total: 0 });
      await controller.list();
      expect(mockService.list).toHaveBeenCalledWith({
        search: undefined,
        status: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('passe les paramètres de filtre et pagination', async () => {
      mockService.list.mockResolvedValue({ items: [], total: 0 });
      await controller.list('test', 'VALIDATED' as never, '3', '5');
      expect(mockService.list).toHaveBeenCalledWith({
        search: 'test',
        status: 'VALIDATED',
        page: 3,
        limit: 5,
      });
    });
  });

  describe('detail', () => {
    it("appelle service.getById avec l'id", async () => {
      mockService.getById.mockResolvedValue({ id: 1 });
      await controller.detail(1);
      expect(mockService.getById).toHaveBeenCalledWith(1);
    });
  });

  describe('documents', () => {
    it('appelle service.listDocuments', async () => {
      mockService.listDocuments.mockResolvedValue([]);
      await controller.documents(1);
      expect(mockService.listDocuments).toHaveBeenCalledWith(1);
    });
  });

  describe('downloadDocument', () => {
    it('redirige si type = redirect', async () => {
      mockService.getDocumentForDownload.mockResolvedValue({
        type: 'redirect',
        url: 'https://cdn.example.com/doc.pdf',
      });
      const res = buildRes();
      await controller.downloadDocument(1, res);
      expect(res.redirect).toHaveBeenCalledWith(
        302,
        'https://cdn.example.com/doc.pdf',
      );
      expect(res.send).not.toHaveBeenCalled();
    });

    it('envoie le buffer si type != redirect', async () => {
      const buffer = Buffer.from('pdf content');
      mockService.getDocumentForDownload.mockResolvedValue({
        type: 'buffer',
        buffer,
        mimeType: 'application/pdf',
        filename: 'doc.pdf',
      });
      const res = buildRes();
      await controller.downloadDocument(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="doc.pdf"',
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe('validate', () => {
    it('appelle service.validate', async () => {
      mockService.validate.mockResolvedValue({ id: 1, status: 'VALIDATED' });
      await controller.validate(1);
      expect(mockService.validate).toHaveBeenCalledWith(1);
    });
  });

  describe('reject', () => {
    it('appelle service.reject avec la raison', async () => {
      mockService.reject.mockResolvedValue({ id: 1 });
      await controller.reject(1, { reason: 'Dossier incomplet' });
      expect(mockService.reject).toHaveBeenCalledWith(1, 'Dossier incomplet');
    });
  });

  describe('suspend', () => {
    it('appelle service.suspend avec la raison', async () => {
      mockService.suspend.mockResolvedValue({ id: 1 });
      await controller.suspend(1, { reason: 'Violation' });
      expect(mockService.suspend).toHaveBeenCalledWith(1, 'Violation');
    });
  });

  describe('reactivate', () => {
    it('appelle service.reactivate', async () => {
      mockService.reactivate.mockResolvedValue({ id: 1 });
      await controller.reactivate(1);
      expect(mockService.reactivate).toHaveBeenCalledWith(1);
    });
  });

  describe('uploadDocument', () => {
    const validFile = {
      originalname: 'statuts.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.alloc(10),
      size: 10,
    } as Express.Multer.File;

    it('throw BadRequestException si aucun fichier', async () => {
      await expect(
        controller.uploadDocument(
          1,
          'STATUTS',
          undefined as unknown as Express.Multer.File,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throw BadRequestException si type invalide', async () => {
      await expect(
        controller.uploadDocument(1, 'INVALID_TYPE', validFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throw BadRequestException si type absent', async () => {
      await expect(
        controller.uploadDocument(1, '', validFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('appelle service.uploadDocument si fichier et type valides', async () => {
      mockService.uploadDocument.mockResolvedValue({ id: 10 });

      await controller.uploadDocument(1, 'STATUTS', validFile);
      expect(mockService.uploadDocument).toHaveBeenCalledWith(
        1,
        'STATUTS',
        validFile,
      );
    });
  });

  describe('deleteDocument', () => {
    it('appelle service.deleteDocument', async () => {
      mockService.deleteDocument.mockResolvedValue({ id: 5 });
      await controller.deleteDocument(5);
      expect(mockService.deleteDocument).toHaveBeenCalledWith(5);
    });
  });

  describe('requestDocuments', () => {
    it('appelle service.requestDocuments avec types et message', async () => {
      mockService.requestDocuments.mockResolvedValue({ ok: true });
      await controller.requestDocuments(1, {
        types: ['STATUTS', 'RNA_ATTESTATION'],
        message: 'Merci de fournir ces documents',
      });
      expect(mockService.requestDocuments).toHaveBeenCalledWith(
        1,
        ['STATUTS', 'RNA_ATTESTATION'],
        'Merci de fournir ces documents',
      );
    });
  });

  describe('create', () => {
    it('appelle service.create avec le DTO', async () => {
      const dto = { name: 'Asso Test', email: 'asso@test.fr' };
      mockService.create.mockResolvedValue({ id: 1 });
      await controller.create(dto as never);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it("appelle service.update avec l'id et le DTO", async () => {
      const dto = { name: 'Asso Updated' };
      mockService.update.mockResolvedValue({ id: 1 });
      await controller.update(1, dto as never);
      expect(mockService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('missionDetail', () => {
    it('appelle service.getMissionById', async () => {
      mockService.getMissionById.mockResolvedValue({ id: 7 });
      await controller.missionDetail(7);
      expect(mockService.getMissionById).toHaveBeenCalledWith(7);
    });
  });

  describe('deleteMission', () => {
    it('appelle service.deleteMission avec la raison', async () => {
      mockService.deleteMission.mockResolvedValue({ ok: true });
      await controller.deleteMission(7, 'Raison de suppression');
      expect(mockService.deleteMission).toHaveBeenCalledWith(
        7,
        'Raison de suppression',
      );
    });
  });

  describe('delete', () => {
    it("appelle service.delete avec l'id et la raison", async () => {
      mockService.delete.mockResolvedValue({ ok: true });
      await controller.delete(1, 'Raison');
      expect(mockService.delete).toHaveBeenCalledWith(1, 'Raison');
    });
  });

  describe('purge', () => {
    it("appelle service.purge avec l'id", async () => {
      mockService.purge.mockResolvedValue({ ok: true });
      await controller.purge(1);
      expect(mockService.purge).toHaveBeenCalledWith(1);
    });
  });
});
