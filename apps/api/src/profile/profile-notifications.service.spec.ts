import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { UserStatus } from '../generated/prisma/client';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import { ConversationService } from '../messaging/conversation.service';
import {
  mockUserComplete,
  mockMappedUser,
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
  createMockConversationService,
} from './profile-test.helpers';

describe('ProfileService — updateNotifications', () => {
  let service: ProfileService;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(async () => {
    mockAuthService = createMockAuthService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: FILE_SERVICE, useValue: createMockFileService() },
        { provide: CookieService, useValue: createMockCookieService() },
        { provide: ConversationService, useValue: createMockConversationService() },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);

    mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUserComplete);
    mockAuthService.prisma.user.update.mockResolvedValue(mockUserComplete);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // ✅ Cas valides
  // =========================================================================

  it('✅ Doit appeler prisma.user.update avec emailNotifications=true', async () => {
    await service.updateNotifications(1, { emailNotifications: true });

    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { emailNotifications: true },
    });
  });

  it('✅ Doit appeler prisma.user.update avec emailNotifications=false', async () => {
    await service.updateNotifications(1, { emailNotifications: false });

    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { emailNotifications: false },
    });
  });

  it('✅ Doit retourner le profil mappé après la mise à jour', async () => {
    const result = await service.updateNotifications(1, {
      emailNotifications: true,
    });

    expect(mockAuthService.mapUserToResponse).toHaveBeenCalled();
    expect(result).toEqual(mockMappedUser);
  });

  it("✅ Doit vérifier que l'utilisateur existe avant de mettre à jour", async () => {
    await service.updateNotifications(1, { emailNotifications: false });

    expect(mockAuthService.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  // =========================================================================
  // ✅ matchNotifications
  // =========================================================================

  it('✅ Doit appeler prisma.user.update avec matchNotifications=true', async () => {
    await service.updateNotifications(1, { matchNotifications: true });

    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { matchNotifications: true },
    });
  });

  it('✅ Doit appeler prisma.user.update avec les deux champs simultanément', async () => {
    await service.updateNotifications(1, {
      emailNotifications: false,
      matchNotifications: true,
    });

    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { emailNotifications: false, matchNotifications: true },
    });
  });

  // =========================================================================
  // ❌ Vérifications utilisateur
  // =========================================================================

  it("❌ Doit lever UnauthorizedException si l'utilisateur est introuvable", async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateNotifications(999, { emailNotifications: true }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockAuthService.prisma.user.update).not.toHaveBeenCalled();
  });

  it('❌ Doit lever BadRequestException si le compte est SUSPENDED', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.SUSPENDED,
    });

    await expect(
      service.updateNotifications(1, { emailNotifications: true }),
    ).rejects.toThrow(BadRequestException);

    expect(mockAuthService.prisma.user.update).not.toHaveBeenCalled();
  });

  it('❌ Doit lever BadRequestException si le compte est DELETED', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.DELETED,
    });

    await expect(
      service.updateNotifications(1, { emailNotifications: false }),
    ).rejects.toThrow(BadRequestException);

    expect(mockAuthService.prisma.user.update).not.toHaveBeenCalled();
  });
});
