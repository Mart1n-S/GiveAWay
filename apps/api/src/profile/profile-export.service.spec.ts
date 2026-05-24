import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
import { UserStatus } from '../generated/prisma/client';
import { FILE_SERVICE } from '../common/files/interfaces/file-service.interface';
import { CookieService } from '../auth/shared/cookie.service';
import { ConversationService } from '../messaging/conversation.service';
import {
  createMockAuthService,
  createMockFileService,
  createMockCookieService,
  createMockConversationService,
} from './profile-test.helpers';

// Utilisateur complet tel que renvoyé par Prisma avec les includes de l'export
const mockExportUser = {
  id: 1,
  email: 'me@test.com',
  firstName: 'Me',
  lastName: 'MYSELF',
  age: 30,
  biography: 'Bio test',
  profilePicture: null,
  password: 'hashed_password',
  googleId: null,
  emailVerifiedAt: new Date('2024-01-15'),
  termsAcceptedAt: new Date('2024-01-10'),
  status: UserStatus.ACTIVE,
  emailNotifications: true,
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-06-01'),
  deletedAt: null,
  address: {
    id: 10,
    street: '10 Rue de la Paix',
    postalCode: '75001',
    city: 'Paris',
    latitude: 48.85,
    longitude: 2.35,
  },
  associations: [
    {
      associationId: 5,
      role: 'ADMIN',
      association: { id: 5, name: 'Asso Test' },
    },
  ],
  skills: [{ skill: { id: 1, label: 'Informatique' } }],
  causes: [{ cause: { id: 1, label: 'Écologie' } }],
  availability: {
    frequency: 'HOURS_WEEK',
    timeSlot: ['WEEKDAY', 'EVENING'],
    type: 'HYBRID',
  },
  participations: [
    {
      createdAt: new Date('2024-05-01'),
      mission: {
        title: 'Mission Alpha',
        type: 'MISSION',
        association: { name: 'Asso Test' },
      },
    },
  ],
};

describe('ProfileService — exportData', () => {
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
        {
          provide: ConversationService,
          useValue: createMockConversationService(),
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    mockAuthService.prisma.user.findUnique.mockResolvedValue(mockExportUser);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // ✅ Cas valides
  // =========================================================================

  it('✅ Doit retourner un Buffer', async () => {
    const result = await service.exportData(1);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('✅ Doit produire un buffer non vide', async () => {
    const result = await service.exportData(1);
    expect(result.length).toBeGreaterThan(0);
  });

  it('✅ Doit appeler prisma.user.findUnique avec le bon userId et les bonnes relations', async () => {
    await service.exportData(1);

    expect(mockAuthService.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        address: true,
        associations: { include: { association: true } },
        skills: { include: { skill: true } },
        causes: { include: { cause: true } },
        availability: true,
        participations: {
          where: { mission: { status: { not: 'DELETED' } } },
          include: { mission: { include: { association: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  });

  it('✅ Doit fonctionner avec un utilisateur sans adresse', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockExportUser,
      address: null,
    });

    const result = await service.exportData(1);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('✅ Doit fonctionner avec un utilisateur sans compétences ni causes', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockExportUser,
      skills: [],
      causes: [],
    });

    const result = await service.exportData(1);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('✅ Doit fonctionner avec un utilisateur sans disponibilités', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockExportUser,
      availability: null,
    });

    const result = await service.exportData(1);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('✅ Doit fonctionner avec un utilisateur sans historique de missions', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockExportUser,
      participations: [],
    });

    const result = await service.exportData(1);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('✅ Doit fonctionner avec un compte Google (sans mot de passe)', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockExportUser,
      password: null,
      googleId: 'google-id-123',
    });

    const result = await service.exportData(1);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  // =========================================================================
  // ❌ Cas d'erreur
  // =========================================================================

  it("❌ Doit lever UnauthorizedException si l'utilisateur est introuvable", async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.exportData(999)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
