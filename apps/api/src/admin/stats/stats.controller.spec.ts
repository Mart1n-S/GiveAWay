import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AdminStatsController } from './stats.controller';
import { AdminStatsService } from './stats.service';

const mockService = {
  overview: jest.fn(),
  timeseries: jest.fn(),
  breakdown: jest.fn(),
  top: jest.fn(),
  adminLogs: jest.fn(),
  exportCsv: jest.fn(),
};

const buildRes = () =>
  ({
    setHeader: jest.fn(),
    send: jest.fn(),
  }) as unknown as Response;

describe('AdminStatsController', () => {
  let controller: AdminStatsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatsController],
      providers: [{ provide: AdminStatsService, useValue: mockService }],
    }).compile();

    controller = module.get(AdminStatsController);
  });

  describe('overview', () => {
    it('parse la query et appelle service.overview', async () => {
      mockService.overview.mockResolvedValue({ activeUsers: { value: 10 } });
      const result = await controller.overview({});
      expect(mockService.overview).toHaveBeenCalled();
      expect(result).toEqual({ activeUsers: { value: 10 } });
    });

    it('transmet from et to à service.overview', async () => {
      mockService.overview.mockResolvedValue({});
      await controller.overview({ from: '2026-01-01', to: '2026-03-31' });
      expect(mockService.overview).toHaveBeenCalledWith('2026-01-01', '2026-03-31');
    });
  });

  describe('timeseries', () => {
    it('parse la query et appelle service.timeseries', async () => {
      mockService.timeseries.mockResolvedValue([]);
      const result = await controller.timeseries({
        metric: 'user_signups',
        granularity: 'day',
      });
      expect(mockService.timeseries).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('breakdown', () => {
    it('parse la query et appelle service.breakdown', async () => {
      mockService.breakdown.mockResolvedValue([{ type: 'MISSION', count: 5 }]);
      const result = await controller.breakdown({
        dimension: 'mission_type',
        limit: '10',
      });
      expect(mockService.breakdown).toHaveBeenCalled();
      expect(result).toEqual([{ type: 'MISSION', count: 5 }]);
    });
  });

  describe('top', () => {
    it('parse la query et appelle service.top', async () => {
      mockService.top.mockResolvedValue([{ id: 1 }]);
      const result = await controller.top({
        entity: 'recent_users',
        limit: '5',
      });
      expect(mockService.top).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('adminLogs', () => {
    it('parse la query et appelle service.adminLogs', async () => {
      mockService.adminLogs.mockResolvedValue({ items: [], total: 0 });
      const result = await controller.adminLogs({ page: '1', limit: '50' });
      expect(mockService.adminLogs).toHaveBeenCalled();
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('exportLogs', () => {
    it('génère le CSV et envoie la réponse avec les bons headers', async () => {
      const fakeItem = {
        id: 1,
        createdAt: new Date('2026-01-15T10:00:00Z'),
        action: 'CREATE_ADMIN',
        entityType: 'ADMIN',
        entityId: 2,
        adminId: 1,
        admin: { email: 'admin@test.fr' },
      };
      mockService.adminLogs.mockResolvedValue({
        items: [fakeItem],
        total: 1,
      });
      mockService.exportCsv.mockReturnValue('id,action\n1,CREATE_ADMIN');

      const res = buildRes();
      await controller.exportLogs({ page: '1', limit: '50' }, res);

      expect(mockService.adminLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 5000 }),
      );
      expect(mockService.exportCsv).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          action: 'CREATE_ADMIN',
          adminEmail: 'admin@test.fr',
        }),
      ]);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="admin-logs.csv"',
      );
      expect(res.send).toHaveBeenCalledWith('id,action\n1,CREATE_ADMIN');
    });

    it('utilise une chaîne vide pour adminEmail si admin absent', async () => {
      const fakeItem = {
        id: 2,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        action: 'DELETE_USER',
        entityType: 'USER',
        entityId: 5,
        adminId: 1,
      };
      mockService.adminLogs.mockResolvedValue({ items: [fakeItem], total: 1 });
      mockService.exportCsv.mockReturnValue('csv-content');

      const res = buildRes();
      await controller.exportLogs({}, res);

      expect(mockService.exportCsv).toHaveBeenCalledWith([
        expect.objectContaining({ adminEmail: '' }),
      ]);
    });
  });
});
