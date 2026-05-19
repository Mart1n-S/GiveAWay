import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from './ws-jwt.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from '../../generated/prisma/client';

const mockJwt = { verifyAsync: jest.fn() };
const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

const makeClient = (auth?: Record<string, unknown>) =>
  ({
    data: {} as Record<string, unknown>,
    handshake: {
      auth: auth ?? {},
      headers: {},
      query: {},
    },
  }) as unknown as import('socket.io').Socket;

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtGuard,
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    guard = mod.get(WsJwtGuard);
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('❌ Refuse si token manquant', async () => {
      const client = makeClient();
      await expect(guard.authenticate(client)).rejects.toBeInstanceOf(
        WsException,
      );
    });

    it('❌ Refuse si JWT invalide', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('bad sig'));
      const client = makeClient({ token: 'xxx' });
      await expect(guard.authenticate(client)).rejects.toBeInstanceOf(
        WsException,
      );
    });

    it('❌ Refuse si sub non numérique', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'not-a-number',
        email: 'x@x.com',
      });
      const client = makeClient({ token: 'jwt' });
      await expect(guard.authenticate(client)).rejects.toBeInstanceOf(
        WsException,
      );
    });

    it('❌ Refuse si user inexistant', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'x@x.com' });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const client = makeClient({ token: 'jwt' });
      await expect(guard.authenticate(client)).rejects.toBeInstanceOf(
        WsException,
      );
    });

    it('❌ Refuse si user non-ACTIVE', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'x@x.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'x@x.com',
        firstName: 'A',
        lastName: 'B',
        status: UserStatus.SUSPENDED,
      });
      const client = makeClient({ token: 'jwt' });
      await expect(guard.authenticate(client)).rejects.toBeInstanceOf(
        WsException,
      );
    });

    it('✅ Accepte un token valide et user ACTIVE', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'a@a.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'a@a.com',
        firstName: 'Alice',
        lastName: 'Dupont',
        status: UserStatus.ACTIVE,
      });
      const client = makeClient({ token: 'jwt' });
      const user = await guard.authenticate(client);
      expect(user).toEqual({
        id: 42,
        email: 'a@a.com',
        firstName: 'Alice',
        lastName: 'Dupont',
      });
    });

    it('✅ Accepte un token via header Authorization', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'a@a.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'a@a.com',
        firstName: 'A',
        lastName: 'B',
        status: UserStatus.ACTIVE,
      });
      const client = {
        data: {},
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer my-token' },
          query: {},
        },
      } as unknown as import('socket.io').Socket;
      const user = await guard.authenticate(client);
      expect(user.id).toBe(42);
    });

    it('✅ Accepte un token via query ?token=', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'a@a.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'a@a.com',
        firstName: 'A',
        lastName: 'B',
        status: UserStatus.ACTIVE,
      });
      const client = {
        data: {},
        handshake: {
          auth: {},
          headers: {},
          query: { token: 'token-from-query' },
        },
      } as unknown as import('socket.io').Socket;
      const user = await guard.authenticate(client);
      expect(user.id).toBe(42);
    });

    it('✅ Accepte un token via cookie access_token (web)', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'a@a.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'a@a.com',
        firstName: 'A',
        lastName: 'B',
        status: UserStatus.ACTIVE,
      });
      const client = {
        data: {},
        handshake: {
          auth: {},
          headers: {
            cookie: 'refresh_token=rrr; access_token=jwt-from-cookie; foo=bar',
          },
          query: {},
        },
      } as unknown as import('socket.io').Socket;
      const user = await guard.authenticate(client);
      expect(user.id).toBe(42);
      // Vérifie que c'est bien le bon token qui a été passé à verifyAsync
      expect(mockJwt.verifyAsync).toHaveBeenCalledWith(
        'jwt-from-cookie',
        expect.any(Object),
      );
    });

    it('✅ priorise handshake.auth.token sur les cookies (mobile gagne)', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'a@a.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'a@a.com',
        firstName: 'A',
        lastName: 'B',
        status: UserStatus.ACTIVE,
      });
      const client = {
        data: {},
        handshake: {
          auth: { token: 'token-from-auth' },
          headers: { cookie: 'access_token=cookie-token' },
          query: {},
        },
      } as unknown as import('socket.io').Socket;
      await guard.authenticate(client);
      expect(mockJwt.verifyAsync).toHaveBeenCalledWith(
        'token-from-auth',
        expect.any(Object),
      );
    });
  });

  describe('canActivate', () => {
    it('✅ Passe si le user est déjà attaché (handshake validé)', async () => {
      const client = makeClient();
      client.data.user = { id: 1, email: 'a@a', firstName: 'A', lastName: 'B' };
      const ctx = {
        switchToWs: () => ({ getClient: () => client }),
      } as unknown as import('@nestjs/common').ExecutionContext;
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });
});
