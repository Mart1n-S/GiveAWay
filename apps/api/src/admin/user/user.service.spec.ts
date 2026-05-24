import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AdminUserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ConversationService } from '../../messaging/conversation.service';
import { UserStatus } from '../../generated/prisma/client';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userSkill: { deleteMany: jest.fn() },
  userCause: { deleteMany: jest.fn() },
  userAvailability: { deleteMany: jest.fn() },
  userAssociationFollow: { deleteMany: jest.fn() },
  refreshToken: { deleteMany: jest.fn() },
  token: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockMail = {
  sendUserCreatedByAdminEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConversationService = {
  deleteConversationsAndNotify: jest
    .fn()
    .mockResolvedValue({ deletedCount: 0, notifiedUserIds: [] }),
};

describe('AdminUserService', () => {
  let service: AdminUserService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: ConversationService, useValue: mockConversationService },
      ],
    }).compile();
    service = module.get(AdminUserService);
  });

  describe('list', () => {
    it('applique status, search et tri', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.user.count.mockResolvedValue(1);
      const res = await service.list({
        search: 'foo',
        status: UserStatus.ACTIVE,
        page: 2,
        limit: 5,
        sortBy: 'email',
        sortDir: 'asc',
      });
      expect(res.total).toBe(1);
      const arg = mockPrisma.user.findMany.mock.calls[0][0];
      expect(arg.where.status).toBe(UserStatus.ACTIVE);
      expect(arg.skip).toBe(5);
      expect(arg.take).toBe(5);
      expect(arg.orderBy).toEqual({ email: 'asc' });
      expect(arg.where.OR).toBeDefined();
    });
  });

  describe('getById', () => {
    it('throw NotFound si user absent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getById(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('retourne l’user avec relations', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.getById(1)).resolves.toEqual({ id: 1 });
    });
  });

  describe('create', () => {
    it('throw Conflict si email déjà utilisé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5 });
      await expect(
        service.create({
          email: 'a@x.fr',
          firstName: 'A',
          lastName: 'B',
          age: 30,
          address: { street: 's', postalCode: '75000', city: 'Paris' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée un user ACTIVE + envoie email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-temp');
      mockPrisma.user.create.mockResolvedValue({
        id: 7,
        email: 'a@x.fr',
        firstName: 'A',
      });
      const res = await service.create({
        email: 'a@x.fr',
        firstName: 'A',
        lastName: 'B',
        age: 30,
        address: { street: 's', postalCode: '75000', city: 'Paris' },
      });
      expect(res.id).toBe(7);
      const arg = mockPrisma.user.create.mock.calls[0][0];
      expect(arg.data.status).toBe(UserStatus.ACTIVE);
      expect(arg.data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(mockMail.sendUserCreatedByAdminEmail).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('ne garde que firstName/lastName/biography (champs autorisés)', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 1 });
      mockPrisma.user.update.mockResolvedValue({ id: 1 });
      await service.update(1, {
        firstName: 'A',
        lastName: 'B',
        biography: 'Bio',
        email: 'should-be-ignored@x.fr',
        password: 'ignored',
      });
      const arg = mockPrisma.user.update.mock.calls[0][0];
      expect(arg.data).toEqual({
        firstName: 'A',
        lastName: 'B',
        biography: 'Bio',
      });
    });
  });

  describe('setStatus', () => {
    it('throw BadRequest si user DELETED', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        status: UserStatus.DELETED,
      });
      await expect(service.setStatus(1, 'ACTIVE')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('met le statut à SUSPENDED', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        status: UserStatus.ACTIVE,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        status: UserStatus.SUSPENDED,
      });
      const res = await service.setStatus(1, 'SUSPENDED');
      expect(res.status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('resetPassword', () => {
    it('regénère password + envoie email', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        email: 'a@x.fr',
      });
      jest.spyOn(argon2, 'hash').mockResolvedValueOnce('h');
      const res = await service.resetPassword(1);
      expect(res).toEqual({ sent: true });
      expect(mockMail.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('throw BadRequest si déjà DELETED', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        status: UserStatus.DELETED,
      });
      await expect(service.softDelete(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('anonymise user (transaction)', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        status: UserStatus.ACTIVE,
      });
      mockPrisma.$transaction.mockResolvedValue([
        {},
        {},
        {},
        {},
        {},
        {},
        { id: 1 },
      ]);
      const res = await service.softDelete(42);
      expect(res).toEqual({ deleted: true });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
