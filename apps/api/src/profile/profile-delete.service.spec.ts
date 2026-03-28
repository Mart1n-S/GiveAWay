import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { UserStatus } from '../generated/prisma/client';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import * as argon2 from 'argon2';
import { Response } from 'express';
import {
  mockUserComplete,
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
} from './profile-test.helpers';

const mockResponse = {} as Response;

describe('ProfileService — deleteProfile', () => {
  let service: ProfileService;
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  let mockFileService: ReturnType<typeof createMockFileService>;
  let mockCookieService: ReturnType<typeof createMockCookieService>;

  beforeEach(async () => {
    mockAuthService = createMockAuthService();
    mockFileService = createMockFileService();
    mockCookieService = createMockCookieService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: FILE_SERVICE, useValue: mockFileService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);

    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      password: 'hashed_password',
    });
    mockAuthService.prisma.user.delete.mockResolvedValue(undefined);
  });

  // ─── Compte email/password ────────────────────────────────────────────────

  describe('Compte email/password', () => {
    it('✅ Doit supprimer le compte avec le bon mot de passe', async () => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      await service.deleteProfile(
        1,
        { password: 'correct_password' },
        mockResponse,
      );

      expect(mockCookieService.clearAuthCookies).toHaveBeenCalledWith(
        mockResponse,
      );
      expect(mockAuthService.prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('✅ Doit supprimer la photo de profil si elle existe', async () => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUserComplete,
        password: 'hashed_password',
        profilePicture: 'avatars/photo.jpg',
      });

      await service.deleteProfile(
        1,
        { password: 'correct_password' },
        mockResponse,
      );

      expect(mockFileService.deleteFile).toHaveBeenCalledWith(
        'avatars/photo.jpg',
      );
    });

    it("✅ Ne doit pas lever d'erreur si la suppression photo échoue", async () => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUserComplete,
        password: 'hashed_password',
        profilePicture: 'avatars/photo.jpg',
      });
      mockFileService.deleteFile.mockRejectedValue(new Error('Storage error'));

      await expect(
        service.deleteProfile(
          1,
          { password: 'correct_password' },
          mockResponse,
        ),
      ).resolves.not.toThrow();
    });

    it('✅ Ne doit pas appeler deleteFile si pas de photo', async () => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUserComplete,
        password: 'hashed_password',
        profilePicture: null,
      });

      await service.deleteProfile(
        1,
        { password: 'correct_password' },
        mockResponse,
      );

      expect(mockFileService.deleteFile).not.toHaveBeenCalled();
    });

    it('❌ Doit lever BadRequestException si mot de passe absent', async () => {
      await expect(service.deleteProfile(1, {}, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si mot de passe incorrect', async () => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.deleteProfile(1, { password: 'wrong_password' }, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Compte Google ────────────────────────────────────────────────────────

  describe('Compte Google', () => {
    beforeEach(() => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUserComplete,
        password: null,
      });
    });

    it('✅ Doit supprimer le compte avec la confirmation "SUPPRIMER"', async () => {
      await service.deleteProfile(
        1,
        { confirmation: 'SUPPRIMER' },
        mockResponse,
      );

      expect(mockCookieService.clearAuthCookies).toHaveBeenCalledWith(
        mockResponse,
      );
      expect(mockAuthService.prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('❌ Doit lever BadRequestException si confirmation absente', async () => {
      await expect(service.deleteProfile(1, {}, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si confirmation incorrecte', async () => {
      await expect(
        service.deleteProfile(1, { confirmation: 'supprimer' }, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ Doit lever BadRequestException si confirmation partielle', async () => {
      await expect(
        service.deleteProfile(1, { confirmation: 'SUPPRIM' }, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Cas communs ──────────────────────────────────────────────────────────

  describe('Cas communs', () => {
    it('❌ Doit lever UnauthorizedException si user non trouvé', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteProfile(999, { password: 'pass' }, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ Doit lever BadRequestException si compte suspendu', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUserComplete,
        status: UserStatus.SUSPENDED,
        password: 'hashed_password',
      });

      await expect(
        service.deleteProfile(1, { password: 'pass' }, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ Doit lever BadRequestException si compte déjà supprimé', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        ...mockUserComplete,
        status: UserStatus.DELETED,
        password: 'hashed_password',
      });

      await expect(
        service.deleteProfile(1, { password: 'pass' }, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('✅ Les cookies sont invalidés avant la suppression BDD', async () => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      mockAuthService.prisma.user.delete.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.deleteProfile(1, { password: 'correct' }, mockResponse),
      ).rejects.toThrow('DB error');

      expect(mockCookieService.clearAuthCookies).toHaveBeenCalled();
    });
  });
});
