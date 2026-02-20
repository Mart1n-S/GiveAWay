import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { GuestGuard } from './guards/guest.guard';
import { AuthGuard } from '@nestjs/passport';

/* eslint-disable @typescript-eslint/unbound-method */
describe('AuthController', () => {
  let controller: AuthController;
  let fileServiceMock: { uploadFile: jest.Mock; deleteFile: jest.Mock };

  const mockAuthService = {
    checkEmailAvailability: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    resendVerificationEmail: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    getMe: jest.fn(),
  };

  const mockFileService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  // Helper pour créer un mock de requête typé sans utiliser 'any'
  const createMockRequest = (
    overrides: Partial<AuthenticatedRequest> = {},
  ): AuthenticatedRequest => {
    return {
      headers: {},
      cookies: {},
      user: { id: 1, email: 'test@test.com' },
      ...overrides,
    } as AuthenticatedRequest;
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: FILE_SERVICE, useValue: mockFileService },
        { provide: 'JwtService', useValue: {} },
        { provide: 'ConfigService', useValue: {} },
      ],
    })
      .overrideGuard(GuestGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('jwt-refresh'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    fileServiceMock = mockFileService;
    jest.clearAllMocks(); // Nettoie les mocks entre chaque test
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@test.com',
      password: 'password123',
    } as any;

    it('✅ Devrait uploader un fichier et enregistrer un utilisateur', async () => {
      const mockFile = { originalname: 'test.jpg' } as Express.Multer.File;
      fileServiceMock.uploadFile.mockResolvedValue({ publicId: 'avatar_id' });
      mockAuthService.register.mockResolvedValue({ message: 'Success' });

      await controller.register(registerDto, mockFile);

      expect(fileServiceMock.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'avatars',
      );
    });

    it("❌ Devrait supprimer le fichier si l'enregistrement échoue", async () => {
      const mockFile = { originalname: 'test.jpg' } as Express.Multer.File;
      fileServiceMock.uploadFile.mockResolvedValue({ publicId: 'avatar_id' });
      mockAuthService.register.mockRejectedValue(new Error('DB Error'));

      await expect(controller.register(registerDto, mockFile)).rejects.toThrow(
        'DB Error',
      );
      expect(fileServiceMock.deleteFile).toHaveBeenCalledWith('avatar_id');
    });
  });

  describe('login', () => {
    it('✅ Devrait connecter un utilisateur et définir les cookies', async () => {
      const req = createMockRequest({ headers: { 'user-agent': 'Mozilla' } });
      mockAuthService.login.mockResolvedValue({
        tokens: { accessToken: 'at', refreshToken: 'rt' },
        user: { id: 1 },
      });

      await controller.login(
        { email: 't@t.com', password: 'p' },
        mockResponse,
        req,
        '127.0.0.1',
      );

      await controller.login(
        { email: 't@t.com', password: 'p' },
        mockResponse,
        req,
        '127.0.0.1',
      );

      expect(mockResponse.cookie).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('✅ Devrait déconnecter un utilisateur', async () => {
      const req = createMockRequest({ cookies: { refresh_token: 'token' } });
      await controller.logout(req, mockResponse, {});

      expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'token');
    });
  });

  describe('getProfile', () => {
    it('✅ Devrait retourner le profil utilisateur', async () => {
      const req = createMockRequest();
      mockAuthService.getMe.mockResolvedValue({ id: 1 });

      const result = await controller.getProfile(req);
      expect(result).toEqual({ id: 1 });
    });

    it("❌ Devrait lever une erreur si l'id utilisateur est manquant", async () => {
      const req = createMockRequest({
        user: { id: undefined as any, email: '' },
      });
      await expect(controller.getProfile(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('✅ Devrait appeler forgotPassword du service', async () => {
    await controller.forgotPassword({ email: 't@t.com' });
    expect(mockAuthService.forgotPassword).toHaveBeenCalled();
  });

  describe('refreshTokens', () => {
    it('✅ Devrait rafraîchir les tokens', async () => {
      const req = createMockRequest({
        user: { sub: 1, refreshToken: 'old-rt' } as any,
        headers: { 'user-agent': 'Mozilla' },
      });
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const result = await controller.refreshTokens(
        req,
        mockResponse,
        '127.0.0.1',
      );

      expect(result).toEqual({ message: 'Session rafraîchie' });
      expect(mockResponse.cookie).toHaveBeenCalled();
    });

    it('✅ Devrait rafraîchir les tokens (Mobile)', async () => {
      const req = createMockRequest({
        user: { sub: 1, refreshToken: 'old-rt' } as any,
      });
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const result = await controller.refreshTokens(
        req,
        mockResponse,
        '127.0.0.1',
        'mobile',
      );

      expect(result.backendTokens).toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('✅ Devrait changer le mot de passe et effacer les cookies', async () => {
      const req = createMockRequest({ user: { id: 1 } as any });
      mockAuthService.changePassword.mockResolvedValue({
        message: 'Password changed',
      });

      const result = await controller.changePassword(
        req,
        { oldPassword: 'old', newPassword: 'new', confirmPassword: 'new' },
        mockResponse,
      );

      expect(result.message).toBeDefined();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
    });
  });

  describe('Les actions de vérification', () => {
    it("✅ Devrait vérifier l'email", async () => {
      await controller.verifyEmail({ code: '123' });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('123');
    });

    it('✅ Devrait réinitialiser le mot de passe', async () => {
      const dto = { code: '123', password: 'new', confirmPassword: 'new' };
      await controller.resetPassword(dto);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
    });

    it('✅ Devrait renvoyer un email de vérification', async () => {
      const dto = { email: 'test@test.com' };
      await controller.resendVerification(dto);
      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith(dto);
    });
  });
});
