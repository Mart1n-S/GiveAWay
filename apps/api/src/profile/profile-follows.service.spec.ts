import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import { ConversationService } from '../messaging/conversation.service';
import {
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
  createMockConversationService,
} from './profile-test.helpers';

describe('ProfileService — getFollowedAssociations', () => {
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
    jest.clearAllMocks();
  });

  it('✅ Retourne un tableau vide si aucun abonnement', async () => {
    mockAuthService.prisma.userAssociationFollow.findMany.mockResolvedValue([]);

    const result = await service.getFollowedAssociations(1);

    expect(result).toEqual([]);
  });

  it('✅ Retourne les associations suivies avec le bon shape { id, name, logoUrl, city }', async () => {
    mockAuthService.prisma.userAssociationFollow.findMany.mockResolvedValue([
      {
        association: {
          id: 42,
          name: 'Les Restos du Cœur',
          logoUrl: 'https://cdn.example.com/logo.png',
          address: { city: 'Lyon' },
        },
      },
      {
        association: {
          id: 99,
          name: 'La Croix-Rouge',
          logoUrl: null,
          address: { city: 'Paris' },
        },
      },
    ]);

    const result = await service.getFollowedAssociations(1);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 42,
      name: 'Les Restos du Cœur',
      logoUrl: 'https://cdn.example.com/logo.png',
      city: 'Lyon',
    });
    expect(result[1]).toEqual({
      id: 99,
      name: 'La Croix-Rouge',
      logoUrl: null,
      city: 'Paris',
    });
  });

  it("✅ city est null quand l'association n'a pas d'adresse", async () => {
    mockAuthService.prisma.userAssociationFollow.findMany.mockResolvedValue([
      {
        association: {
          id: 7,
          name: 'Asso Sans Adresse',
          logoUrl: null,
          address: null,
        },
      },
    ]);

    const result = await service.getFollowedAssociations(1);

    expect(result).toHaveLength(1);
    expect(result[0].city).toBeNull();
  });

  it('✅ Passe le bon userId dans le filtre Prisma', async () => {
    mockAuthService.prisma.userAssociationFollow.findMany.mockResolvedValue([]);

    await service.getFollowedAssociations(42);

    expect(
      mockAuthService.prisma.userAssociationFollow.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 42 },
      }),
    );
  });

  it("✅ Passe l'order createdAt: desc à Prisma", async () => {
    mockAuthService.prisma.userAssociationFollow.findMany.mockResolvedValue([]);

    await service.getFollowedAssociations(1);

    expect(
      mockAuthService.prisma.userAssociationFollow.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});
