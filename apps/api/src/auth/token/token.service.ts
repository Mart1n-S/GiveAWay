import { ForbiddenException, Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import { UserStatus, RefreshToken } from '../../generated/prisma/client';
import { AuthService } from '../auth.service';

@Injectable()
export class TokenService {
  constructor(private readonly authService: AuthService) {}

  async refreshTokens(
    userId: number,
    incomingRefreshToken: string,
    userAgent: string,
    ip: string,
  ) {
    const { prisma } = this.authService;

    // 1. Comme pour le logout, on récupère tous les tokens de l'user
    const tokens = await prisma.refreshToken.findMany({ where: { userId } });

    let tokenRow: RefreshToken | null = null;
    // 2. On cherche quel hash en base correspond au token envoyé par l'utilisateur
    for (const t of tokens) {
      if (await verify(t.hashedToken, incomingRefreshToken)) {
        tokenRow = t;
        break;
      }
    }

    // 3. Si aucun hash ne correspond, c'est que le token est faux ou a déjà été supprimé
    if (!tokenRow) {
      throw new ForbiddenException('Refresh token invalide');
    }

    // 4. Vérification de la date d'expiration
    // Si la date actuelle est > à la date d'expiration du token en base
    if (new Date() > tokenRow.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: tokenRow.id } });
      throw new ForbiddenException('Refresh token expiré');
    }

    // 5. ROTATION
    // On supprime l'ancien token utilisé. Il ne doit servir qu'UNE SEULE FOIS.
    await prisma.refreshToken.delete({ where: { id: tokenRow.id } });

    // 6. On vérifie que l'utilisateur existe toujours (au cas où il a été supprimé entre temps)
    const user = await prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new ForbiddenException('Utilisateur introuvable ou compte inactif');
    }

    // 7. On génère un tout nouveau couple (Access + Refresh)
    const newTokens = await this.authService.generateTokens(
      user.id,
      user.email,
    );
    // 8. On sauvegarde le NOUVEAU refresh token en base
    await this.authService.saveRefreshToken(
      user.id,
      newTokens.refreshToken,
      userAgent,
      ip,
    );

    return newTokens;
  }
}
