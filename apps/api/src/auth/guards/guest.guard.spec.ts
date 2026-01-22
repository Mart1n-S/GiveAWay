import { GuestGuard } from './guest.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('GuestGuard', () => {
  let guard: GuestGuard;

  // Mock basique pour le ConfigService
  const mockConfig = {
    get: jest.fn(() => 'secret'),
  };

  // Mock basique pour le JwtService
  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestGuard,
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get<GuestGuard>(GuestGuard);
    jest.clearAllMocks();
  });

  // Fonction utilitaire pour mocker le contexte d'exécution (req.cookies)
  const createMockContext = (cookies: Record<string, any>) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it("✅ Doit laisser passer si AUCUN token n'est présent", async () => {
    const context = createMockContext({}); // Cookies vides
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('✅ Doit laisser passer si le token est INVALIDE (ex: expiré)', async () => {
    const context = createMockContext({ access_token: 'invalid_token' });

    // On simule une erreur lors de la vérification JWT via notre mock
    mockJwt.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('❌ Doit BLOQUER (Forbidden) si le token est VALIDE', async () => {
    const context = createMockContext({ access_token: 'valid_token' });

    // On simule que le JWT est valide via notre mock
    mockJwt.verifyAsync.mockResolvedValue({ userId: 1 });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
