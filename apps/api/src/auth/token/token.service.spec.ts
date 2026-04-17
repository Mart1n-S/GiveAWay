import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { TokenService } from './token.service';
import { AuthService } from '../auth.service';
import { UserStatus } from '../../generated/prisma/client';

const mockAuthService = {
  prisma: {
    refreshToken: { findMany: jest.fn(), delete: jest.fn() },
    user: { findFirst: jest.fn() },
  },
  generateTokens: jest.fn().mockResolvedValue({
    accessToken: 'new_at',
    refreshToken: 'new_rt',
  }),
  saveRefreshToken: jest.fn().mockResolvedValue(undefined),
};

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jest.clearAllMocks();
  });

  it("✅ Rotation réussie — supprime l'ancien token et génère un nouveau couple", async () => {
    const oldToken = {
      id: 100,
      hashedToken: 'old_hash',
      expiresAt: new Date(Date.now() + 10000),
    };
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue([oldToken]);
    mockAuthService.prisma.user.findFirst.mockResolvedValue({
      id: 1,
      email: 't@t.com',
      status: UserStatus.ACTIVE,
    });
    jest.spyOn(argon2, 'verify').mockResolvedValue(true);

    const result = await service.refreshTokens(1, 'old_raw', 'agent', 'ip');

    expect(mockAuthService.prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 100 },
    });
    expect(result).toHaveProperty('accessToken', 'new_at');
    expect(result).toHaveProperty('refreshToken', 'new_rt');
  });

  it('❌ Doit lever ForbiddenException si token invalide', async () => {
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue([
      { id: 1, hashedToken: 'hash', expiresAt: new Date(Date.now() + 10000) },
    ]);
    jest.spyOn(argon2, 'verify').mockResolvedValue(false);

    await expect(
      service.refreshTokens(1, 'wrong_token', 'agent', 'ip'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('❌ Doit lever ForbiddenException si token expiré', async () => {
    const expiredToken = {
      id: 1,
      hashedToken: 'h1',
      expiresAt: new Date(Date.now() - 1000),
    };
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue([
      expiredToken,
    ]);
    jest.spyOn(argon2, 'verify').mockResolvedValue(true);

    await expect(
      service.refreshTokens(1, 'raw', 'agent', 'ip'),
    ).rejects.toThrow(ForbiddenException);

    expect(mockAuthService.prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('❌ Doit lever ForbiddenException si utilisateur inactif', async () => {
    const validToken = {
      id: 1,
      hashedToken: 'h1',
      expiresAt: new Date(Date.now() + 10000),
    };
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue([
      validToken,
    ]);
    mockAuthService.prisma.user.findFirst.mockResolvedValue(null);
    jest.spyOn(argon2, 'verify').mockResolvedValue(true);

    await expect(
      service.refreshTokens(1, 'raw', 'agent', 'ip'),
    ).rejects.toThrow(ForbiddenException);
  });
});
