import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '../generated/prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // On récupère le token dans le Header "Authorization: Bearer ..."
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // On rejette les tokens périmés
      // On utilise la même clé secrète que dans AuthModule
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'SECRET_NON_MODIFIE_DANS_LE_ENV',
    });
  }

  // Cette méthode est appelée si le token est valide.
  async validate(payload: { sub: number; email: string }) {
    // 1. On vérifie en DIRECT dans la BDD
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      // Optimisation : On ne sélectionne que les champs utiles
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        // Ajouter d'autres champs si nécessaire à l'avenir
      },
    });

    // 2. Si l'user n'existe plus (supprimé)
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // 3. Si l'user est banni ou suspendu
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Votre compte est suspendu ou désactivé');
    }

    // Ce user sera disponible dans tes controllers via `req.user`
    return user;
  }
}
