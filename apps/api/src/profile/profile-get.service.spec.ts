import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { UserStatus } from '../generated/prisma/client';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import {
  mockUserComplete,
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
} from './profile-test.helpers';

describe('ProfileService — getProfile', () => {
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
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('✅ Doit retourner un profil complet mappé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUserComplete);

    const result = await service.getProfile(1);

    expect(mockAuthService.prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
    expect(mockAuthService.mapUserToResponse).toHaveBeenCalledWith(
      mockUserComplete,
    );
    expect(result.email).toBe('me@test.com');
    expect(result.skills).toHaveLength(1);
    expect(result.causes).toHaveLength(1);
    expect(result.availability).toBeDefined();
  });

  it('✅ Doit inclure toutes les relations dans la requête Prisma', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUserComplete);

    await service.getProfile(1);

    expect(mockAuthService.prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          address: true,
          associations: expect.anything(),
          skills: expect.anything(),
          causes: expect.anything(),
          availability: true,
          participations: expect.anything(),
        }),
      }),
    );
  });

  it('❌ Doit lever UnauthorizedException si user non trouvé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getProfile(999)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('❌ Doit lever BadRequestException si compte suspendu', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.SUSPENDED,
    });

    await expect(service.getProfile(1)).rejects.toThrow(BadRequestException);
  });

  it('❌ Doit lever BadRequestException si compte supprimé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.DELETED,
    });

    await expect(service.getProfile(1)).rejects.toThrow(BadRequestException);
  });
});
