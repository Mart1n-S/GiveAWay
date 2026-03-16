import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { LogoutService } from './logout.service';
import { AuthService } from '../auth.service';

const mockAuthService = {
  prisma: {
    refreshToken: { findMany: jest.fn(), delete: jest.fn() },
  },
};

describe('LogoutService', () => {
  let service: LogoutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<LogoutService>(LogoutService);
    jest.clearAllMocks();
  });

  it('✅ Doit supprimer le refresh token correspondant', async () => {
    const mockTokens = [
      { id: 1, hashedToken: 'hash1' },
      { id: 2, hashedToken: 'hash2' },
    ];
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue(mockTokens);
    jest
      .spyOn(argon2, 'verify')
      .mockImplementation((h) => Promise.resolve(h === 'hash2'));

    await service.logout(1, 'raw_token_2');

    expect(mockAuthService.prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 2 },
    });
  });

  it('✅ Ne doit rien faire si aucun token ne correspond', async () => {
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue([
      { id: 1, hashedToken: 'hash1' },
    ]);
    jest.spyOn(argon2, 'verify').mockResolvedValue(false);

    await service.logout(1, 'unknown_token');

    expect(mockAuthService.prisma.refreshToken.delete).not.toHaveBeenCalled();
  });

  it("✅ Ne doit rien faire si l'utilisateur n'a aucun token en base", async () => {
    mockAuthService.prisma.refreshToken.findMany.mockResolvedValue([]);

    await service.logout(1, 'any_token');

    expect(mockAuthService.prisma.refreshToken.delete).not.toHaveBeenCalled();
  });
});
