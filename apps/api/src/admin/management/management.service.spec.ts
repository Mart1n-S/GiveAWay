import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AdminManagementService } from './management.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { AdminRole } from '@repo/shared';

const mockPrisma = {
  admin: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  adminRefreshToken: {
    deleteMany: jest.fn(),
  },
};

const mockMail = {
  sendAdminInvitationEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  get: jest.fn(() => 'https://admin.test/login'),
};

describe('AdminManagementService', () => {
  let service: AdminManagementService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminManagementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AdminManagementService);
  });

  describe('list', () => {
    it('retourne les admins triés desc', async () => {
      mockPrisma.admin.findMany.mockResolvedValue([{ id: 1 }]);
      const res = await service.list();
      expect(res).toEqual([{ id: 1 }]);
      expect(mockPrisma.admin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('getById', () => {
    it('throw NotFound si introuvable', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      await expect(service.getById(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('retourne l’admin avec ses 20 derniers logs', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({ id: 1, logs: [] });
      const res = await service.getById(1);
      expect(res.id).toBe(1);
    });
  });

  describe('create', () => {
    it('throw Conflict si email déjà utilisé', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({ id: 5 });
      await expect(
        service.create({
          email: 'a@x.fr',
          firstName: 'A',
          lastName: 'B',
          role: AdminRole.ADMIN,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée l’admin (mustChangePassword=true) et envoie un email', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-temp');
      mockPrisma.admin.create.mockResolvedValue({
        id: 9,
        email: 'a@x.fr',
        firstName: 'A',
      });

      const res = await service.create({
        email: 'a@x.fr',
        firstName: 'A',
        lastName: 'B',
        role: AdminRole.ADMIN,
      });
      expect(res.id).toBe(9);
      expect(mockPrisma.admin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mustChangePassword: true }),
        }),
      );
      expect(mockMail.sendAdminInvitationEmail).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throw NotFound si target absente', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      await expect(
        service.update(1, 1, { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throw Forbidden si admin tente de se rétrograder lui-même', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 1,
        role: 'SUPER_ADMIN',
      });
      await expect(
        service.update(1, 1, { role: AdminRole.ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throw Forbidden si rétrogradation du DERNIER super admin', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 2,
        role: 'SUPER_ADMIN',
      });
      mockPrisma.admin.count.mockResolvedValue(1);
      await expect(
        service.update(1, 2, { role: AdminRole.ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throw Conflict si email déjà utilisé par un autre admin', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({ id: 2, role: 'ADMIN' });
      mockPrisma.admin.findFirst.mockResolvedValue({ id: 99 });
      await expect(
        service.update(1, 2, { email: 'taken@x.fr' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('met à jour normalement', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({ id: 2, role: 'ADMIN' });
      mockPrisma.admin.findFirst.mockResolvedValue(null);
      mockPrisma.admin.update.mockResolvedValue({ id: 2, firstName: 'New' });
      const res = await service.update(1, 2, { firstName: 'New' });
      expect(res.firstName).toBe('New');
    });
  });

  describe('resetPassword', () => {
    it('throw NotFound si admin absent', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('regénère password, supprime refresh tokens et envoie email', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@x.fr',
        firstName: 'A',
      });
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-temp');
      const res = await service.resetPassword(1);
      expect(res).toEqual({ sent: true });
      expect(mockPrisma.admin.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'hashed-temp', mustChangePassword: true },
      });
      expect(mockPrisma.adminRefreshToken.deleteMany).toHaveBeenCalledWith({
        where: { adminId: 1 },
      });
      expect(mockMail.sendAdminPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throw Forbidden si auto-suppression', async () => {
      await expect(service.delete(1, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throw NotFound si target inconnue', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      await expect(service.delete(1, 2)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throw Forbidden si suppression du DERNIER super admin', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 2,
        role: 'SUPER_ADMIN',
      });
      mockPrisma.admin.count.mockResolvedValue(1);
      await expect(service.delete(1, 2)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('supprime un admin normalement', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({ id: 2, role: 'ADMIN' });
      mockPrisma.admin.delete.mockResolvedValue({ id: 2 });
      const res = await service.delete(1, 2);
      expect(res).toEqual({ deleted: true });
    });
  });
});
