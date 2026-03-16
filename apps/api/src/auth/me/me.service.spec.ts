import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MeService } from './me.service';
import { AuthService } from '../auth.service';
import { UserStatus } from '../../generated/prisma/client';

const mockUserComplete = {
  id: 1,
  email: 'me@test.com',
  firstName: 'Me',
  lastName: 'Myself',
  age: 30,
  biography: 'Bio',
  profilePicture: null,
  password: 'hash',
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  address: {
    id: 10,
    street: 'Rue Test',
    postalCode: '75000',
    city: 'Paris',
    latitude: 48.85,
    longitude: 2.35,
  },
  associations: [
    {
      associationId: 5,
      role: 'PRESIDENT',
      association: { name: 'Asso Test' },
    },
  ],
};

const mockAuthService = {
  prisma: {
    user: { findUnique: jest.fn() },
  },
  mapUserToResponse: jest.fn().mockReturnValue({
    id: 1,
    email: 'me@test.com',
    address: { city: 'Paris' },
    associations: [{ name: 'Asso Test' }],
    createdAt: new Date().toISOString(),
  }),
};

describe('MeService', () => {
  let service: MeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<MeService>(MeService);
    jest.clearAllMocks();
  });

  it('✅ Doit retourner un User mappé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(mockUserComplete);

    const result = await service.getMe(1);

    expect(mockAuthService.mapUserToResponse).toHaveBeenCalledWith(
      mockUserComplete,
    );
    expect(result.email).toBe('me@test.com');
    expect(result.address?.city).toBe('Paris');
    expect(result.associations).toHaveLength(1);
  });

  it('❌ Doit lever UnauthorizedException si user non trouvé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getMe(999)).rejects.toThrow(UnauthorizedException);
  });

  it('❌ Doit lever BadRequestException si compte suspendu', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.SUSPENDED,
    });

    await expect(service.getMe(1)).rejects.toThrow(BadRequestException);
  });

  it('❌ Doit lever BadRequestException si compte supprimé', async () => {
    mockAuthService.prisma.user.findUnique.mockResolvedValue({
      ...mockUserComplete,
      status: UserStatus.DELETED,
    });

    await expect(service.getMe(1)).rejects.toThrow(BadRequestException);
  });
});
