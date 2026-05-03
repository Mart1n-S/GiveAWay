import { Test, TestingModule } from '@nestjs/testing';
import { AdminManagementController } from './management.controller';
import { AdminManagementService } from './management.service';
import { AdminRole } from '@repo/shared';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';

const mockService = {
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  resetPassword: jest.fn(),
  delete: jest.fn(),
};

const currentAdmin = {
  id: 1,
  email: 'super@test.fr',
  role: AdminRole.SUPER_ADMIN,
};

describe('AdminManagementController', () => {
  let controller: AdminManagementController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminManagementController],
      providers: [{ provide: AdminManagementService, useValue: mockService }],
    })
      .overrideInterceptor(AdminLogInterceptor)
      .useValue({
        intercept: (_ctx: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .compile();

    controller = module.get(AdminManagementController);
  });

  describe('list', () => {
    it('retourne la liste des admins', async () => {
      mockService.list.mockResolvedValue([{ id: 1 }]);
      const result = await controller.list();
      expect(mockService.list).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('detail', () => {
    it('retourne un admin par son id', async () => {
      mockService.getById.mockResolvedValue({ id: 2 });
      const result = await controller.detail(2);
      expect(mockService.getById).toHaveBeenCalledWith(2);
      expect(result).toEqual({ id: 2 });
    });
  });

  describe('create', () => {
    it('crée un admin et retourne le résultat', async () => {
      const dto = { email: 'new@test.fr', firstName: 'New', lastName: 'Admin' };
      mockService.create.mockResolvedValue({ id: 3, ...dto });
      const result = await controller.create(dto as never);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 3, ...dto });
    });
  });

  describe('update', () => {
    it('met à jour un admin en passant le currentAdmin.id', async () => {
      const dto = { firstName: 'Updated' };
      mockService.update.mockResolvedValue({ id: 2, firstName: 'Updated' });
      const result = await controller.update(currentAdmin, 2, dto as never);
      expect(mockService.update).toHaveBeenCalledWith(1, 2, dto);
      expect(result).toEqual({ id: 2, firstName: 'Updated' });
    });
  });

  describe('resetPassword', () => {
    it("réinitialise le mot de passe d'un admin", async () => {
      mockService.resetPassword.mockResolvedValue({ tempPassword: 'Tmp!123' });
      const result = await controller.resetPassword(2);
      expect(mockService.resetPassword).toHaveBeenCalledWith(2);
      expect(result).toEqual({ tempPassword: 'Tmp!123' });
    });
  });

  describe('delete', () => {
    it('supprime un admin en passant le currentAdmin.id', async () => {
      mockService.delete.mockResolvedValue({ ok: true });
      const result = await controller.delete(currentAdmin, 2);
      expect(mockService.delete).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual({ ok: true });
    });
  });
});
