import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const mockProfileService = {
  exportData: jest.fn(),
};

const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest =>
  ({
    headers: {},
    cookies: {},
    user: { id: 1, email: 'test@test.com' },
    ...overrides,
  }) as AuthenticatedRequest;

const createMockResponse = (): jest.Mocked<Partial<Response>> => ({
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('ProfileController — exportData', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfileController>(ProfileController);
    jest.clearAllMocks();
  });

  // =========================================================================
  // ✅ Cas valides
  // =========================================================================

  it('✅ Doit appeler exportData avec le bon userId', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const fakeBuffer = Buffer.from('fake-xlsx');
    mockProfileService.exportData.mockResolvedValue(fakeBuffer);

    await controller.exportData(req, res as Response);

    expect(mockProfileService.exportData).toHaveBeenCalledWith(1);
  });

  it('✅ Doit définir le Content-Type xlsx', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    mockProfileService.exportData.mockResolvedValue(Buffer.from('fake-xlsx'));

    await controller.exportData(req, res as Response);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', XLSX_MIME);
  });

  it('✅ Doit définir Content-Disposition avec un nom de fichier .xlsx', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    mockProfileService.exportData.mockResolvedValue(Buffer.from('fake-xlsx'));

    await controller.exportData(req, res as Response);

    const calls = (res.setHeader as jest.Mock).mock.calls;
    const dispositionCall = calls.find(
      ([header]) => header === 'Content-Disposition',
    );
    expect(dispositionCall).toBeDefined();
    expect(dispositionCall[1]).toMatch(
      /attachment; filename="giveaway-mes-donnees-.+\.xlsx"/,
    );
  });

  it('✅ Doit envoyer le buffer retourné par le service', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const fakeBuffer = Buffer.from('fake-xlsx-content');
    mockProfileService.exportData.mockResolvedValue(fakeBuffer);

    await controller.exportData(req, res as Response);

    expect(res.send).toHaveBeenCalledWith(fakeBuffer);
  });

  // =========================================================================
  // ❌ Cas d'erreur
  // =========================================================================

  it('❌ Doit lever UnauthorizedException si req.user.id est absent', async () => {
    const req = createMockRequest({
      user: { id: undefined as unknown as number, email: '' },
    });
    const res = createMockResponse();

    await expect(controller.exportData(req, res as Response)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(mockProfileService.exportData).not.toHaveBeenCalled();
  });

  it('✅ Doit propager les erreurs lancées par le service', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    mockProfileService.exportData.mockRejectedValue(new Error('ExcelJS error'));

    await expect(controller.exportData(req, res as Response)).rejects.toThrow(
      'ExcelJS error',
    );
  });
});
