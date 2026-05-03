import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserController } from './user.controller';
import { AdminUserService } from './user.service';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';

const mockService = {
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  setStatus: jest.fn(),
  softDelete: jest.fn(),
};

describe('AdminUserController', () => {
  let controller: AdminUserController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [{ provide: AdminUserService, useValue: mockService }],
    })
      .overrideInterceptor(AdminLogInterceptor)
      .useValue({ intercept: (_ctx: unknown, next: { handle: () => unknown }) => next.handle() })
      .compile();

    controller = module.get(AdminUserController);
  });

  describe('list', () => {
    it('parse la query et appelle service.list', async () => {
      mockService.list.mockResolvedValue({ items: [], total: 0 });
      const result = await controller.list({ page: '1', limit: '20' });
      expect(mockService.list).toHaveBeenCalled();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('utilise les valeurs par défaut si query vide', async () => {
      mockService.list.mockResolvedValue({ items: [], total: 0 });
      await controller.list({});
      expect(mockService.list).toHaveBeenCalled();
    });
  });

  describe('detail', () => {
    it('appelle service.getById', async () => {
      mockService.getById.mockResolvedValue({ id: 5 });
      const result = await controller.detail(5);
      expect(mockService.getById).toHaveBeenCalledWith(5);
      expect(result).toEqual({ id: 5 });
    });
  });

  describe('create', () => {
    it('appelle service.create avec le DTO', async () => {
      const dto = { email: 'user@test.fr', firstName: 'User', lastName: 'Test' };
      mockService.create.mockResolvedValue({ id: 10, ...dto });
      const result = await controller.create(dto as never);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 10, ...dto });
    });
  });

  describe('update', () => {
    it('appelle service.update avec l\'id et le DTO', async () => {
      const dto = { firstName: 'Updated' };
      mockService.update.mockResolvedValue({ id: 5, ...dto });
      const result = await controller.update(5, dto as never);
      expect(mockService.update).toHaveBeenCalledWith(5, dto);
      expect(result).toEqual({ id: 5, ...dto });
    });
  });

  describe('setStatus', () => {
    it('appelle service.setStatus avec l\'id et le statut', async () => {
      mockService.setStatus.mockResolvedValue({ id: 5, status: 'SUSPENDED' });
      const result = await controller.setStatus(5, { status: 'SUSPENDED' as never });
      expect(mockService.setStatus).toHaveBeenCalledWith(5, 'SUSPENDED');
      expect(result).toEqual({ id: 5, status: 'SUSPENDED' });
    });
  });

  describe('delete', () => {
    it('appelle service.softDelete', async () => {
      mockService.softDelete.mockResolvedValue({ ok: true });
      const result = await controller.delete(5);
      expect(mockService.softDelete).toHaveBeenCalledWith(5);
      expect(result).toEqual({ ok: true });
    });
  });
});
