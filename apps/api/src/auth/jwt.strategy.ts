import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '../generated/prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Cookies (Web) OU Header (Mobile)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // 1. Priorité aux Cookies
          const cookies = request?.cookies as
            | Record<string, string>
            | undefined;
          return cookies?.access_token || null;
        },
        // 2. Fallback sur le Header Bearer
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const userId = parseInt(payload.sub, 10);

    // 1. Vérification en BDD
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        // Ajouter d'autres champs si nécessaire à l'avenir
      },
    });

    // 2. Si l'user n'existe plus
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // 3. Si l'user est banni/suspendu
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Votre compte est suspendu ou désactivé');
    }

    return user;
  }
}
