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
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
  createMockConversationService,
} from './profile-test.helpers';

describe('ProfileService — updateProfile', () => {
  let service: ProfileService;
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  let mockFileService: ReturnType<typeof createMockFileService>;

  const mockAddress = {
    street: '1 Rue de la Paix',
    postalCode: '75001',
    city: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
  };

  beforeEach(async () => {
    mockAuthService = createMockAuthService();
    mockFileService = createMockFileService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: FILE_SERVICE, useValue: mockFileService },
        { provide: CookieService, useValue: createMockCookieService() },
        {
          provide: ConversationService,
          useValue: createMockConversationService(),
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);

    mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUserComplete);
    mockAuthService.prisma.user.update.mockResolvedValue(mockUserComplete);
    mockAuthService.prisma.userSkill.deleteMany.mockResolvedValue({ count: 0 });
    mockAuthService.prisma.userSkill.createMany.mockResolvedValue({ count: 0 });
    mockAuthService.prisma.userCause.deleteMany.mockResolvedValue({ count: 0 });
    mockAuthService.prisma.userCause.createMany.mockResolvedValue({ count: 0 });
    mockAuthService.prisma.userAvailability.upsert.mockResolvedValue({});
  });

  it('✅ Doit mettre à jour les infos de base', async () => {
    const result = await service.updateProfile(1, {
      firstName: 'Jean',
      biography: 'Nouvelle bio',
      address: mockAddress,
    });

    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          firstName: 'Jean',
          biography: 'Nouvelle bio',
        }),
      }),
    );
    expect(result).toBeDefined();
  });

  it('✅ Doit uploader la photo et mettre à jour profilePicture', async () => {
    const mockFile = { buffer: Buffer.from('img') } as Express.Multer.File;

    await service.updateProfile(1, { address: mockAddress }, mockFile);

    expect(mockFileService.uploadFile).toHaveBeenCalledWith(
      mockFile,
      'avatars',
    );
    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profilePicture: 'avatars/test.jpg',
        }),
      }),
    );
  });

  it('✅ Doit remplacer les skills si skillIds fournis', async () => {
    await service.updateProfile(1, {
      skillIds: [1, 2, 3],
      address: mockAddress,
    });

    expect(mockAuthService.prisma.userSkill.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(mockAuthService.prisma.userSkill.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 1, skillId: 1 },
        { userId: 1, skillId: 2 },
        { userId: 1, skillId: 3 },
      ],
    });
  });

  it('✅ Doit vider les skills si skillIds est un tableau vide', async () => {
    await service.updateProfile(1, { skillIds: [], address: mockAddress });

    expect(mockAuthService.prisma.userSkill.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(mockAuthService.prisma.userSkill.createMany).not.toHaveBeenCalled();
  });

  it('✅ Doit remplacer les causes si causeIds fournis', async () => {
    await service.updateProfile(1, { causeIds: [1, 2], address: mockAddress });

    expect(mockAuthService.prisma.userCause.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(mockAuthService.prisma.userCause.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 1, causeId: 1 },
        { userId: 1, causeId: 2 },
      ],
    });
  });

  it('✅ Doit upsert la disponibilité si availability fournie', async () => {
    await service.updateProfile(1, {
      address: mockAddress,
      availability: {
        frequency: 'HOURS_WEEK',
        timeSlot: 'WEEKDAY',
        type: 'HYBRID',
      },
    });

    expect(mockAuthService.prisma.userAvailability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1 },
        create: expect.objectContaining({ userId: 1 }),
        update: expect.anything(),
      }),
    );
  });

  it("✅ Doit upsert l'adresse si address fournie", async () => {
    await service.updateProfile(1, {
      address: {
        street: '1 Rue de la Paix',
        postalCode: '75001',
        city: 'Paris',
      },
    });

    expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          address: expect.objectContaining({
            upsert: expect.anything(),
          }),
        }),
      }),
    );
  });

  it('✅ Ne doit pas appeler userSkill si skillIds absent', async () => {
    await service.updateProfile(1, { firstName: 'Jean', address: mockAddress });

    expect(mockAuthService.prisma.userSkill.deleteMany).not.toHaveBeenCalled();
    expect(mockAuthService.prisma.userSkill.createMany).not.toHaveBeenCalled();
  });

  it('✅ Ne doit pas appeler userAvailability si availability absent', async () => {
    await service.updateProfile(1, { firstName: 'Jean', address: mockAddress });

    expect(
      mockAuthService.prisma.userAvailability.upsert,
    ).not.toHaveBeenCalled();
  });

  it('✅ Doit faire un rollback image si la mise à jour BDD échoue', async () => {
    const mockFile = { buffer: Buffer.from('img') } as Express.Multer.File;
    mockAuthService.prisma.user.update.mockRejectedValue(new Error('DB error'));

    await expect(
      service.updateProfile(1, { address: mockAddress }, mockFile),
    ).rejects.toThrow('DB error');

    expect(mockFileService.deleteFile).toHaveBeenCalledWith('avatars/test.jpg');
  });

  it('❌ Doit lever UnauthorizedException si user non trouvé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateProfile(999, { address: mockAddress }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('❌ Doit lever BadRequestException si compte suspendu', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.SUSPENDED,
    });

    await expect(service.updateProfile(1, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('❌ Doit lever BadRequestException si compte supprimé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.DELETED,
    });

    await expect(service.updateProfile(1, {})).rejects.toThrow(
      BadRequestException,
    );
  });
});
