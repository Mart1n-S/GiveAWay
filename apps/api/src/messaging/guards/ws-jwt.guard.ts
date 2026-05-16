import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from '../../generated/prisma/client';

export interface WsAuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthenticatedSocket extends Socket {
  data: { user?: WsAuthenticatedUser };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    // Si déjà authentifié (handshake), on bypass
    if (client.data?.user) {
      return true;
    }

    const user = await this.authenticate(client);
    client.data.user = user;
    return true;
  }

  /**
   * Authentifie un socket à partir de son handshake (utilisé aussi en handleConnection).
   * - Token JWT lu dans handshake.auth.token, puis dans Authorization header en fallback.
   * - Vérifie la signature, l'expiration, l'existence du user et son statut ACTIVE.
   */
  async authenticate(
    client: AuthenticatedSocket,
  ): Promise<WsAuthenticatedUser> {
    const token = this.extractToken(client);
    if (!token) {
      throw new WsException('Token manquant');
    }

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new WsException('Token invalide ou expiré');
    }

    const userId = Number.parseInt(payload.sub, 10);
    if (!Number.isFinite(userId)) {
      throw new WsException('Token invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!user) {
      throw new WsException('Utilisateur introuvable');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new WsException('Compte suspendu ou désactivé');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // 1. handshake.auth.token (préféré côté mobile via socket.io-client.auth)
    const auth = client.handshake?.auth as
      | { token?: string | null }
      | undefined;
    if (auth?.token) {
      return auth.token;
    }

    // 2. Header Authorization
    const header =
      client.handshake?.headers?.authorization ||
      client.handshake?.headers?.Authorization;
    if (
      typeof header === 'string' &&
      header.toLowerCase().startsWith('bearer ')
    ) {
      return header.slice('Bearer '.length).trim();
    }

    // 3. Cookie access_token (web : cookies httpOnly envoyés via withCredentials)
    const cookieHeader = client.handshake?.headers?.cookie;
    if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
      const cookies = this.parseCookies(cookieHeader);
      const accessToken = cookies['access_token'];
      if (accessToken) return accessToken;
    }

    // 4. Query parameter ?token=... (debug uniquement)
    const queryToken = client.handshake?.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    return null;
  }

  private parseCookies(header: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of header.split(';')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const name = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      try {
        out[name] = decodeURIComponent(value);
      } catch {
        out[name] = value;
      }
    }
    return out;
  }
}
