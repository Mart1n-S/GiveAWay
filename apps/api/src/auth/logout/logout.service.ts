import { Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import { AuthService } from '../auth.service';

@Injectable()
export class LogoutService {
  constructor(private readonly authService: AuthService) {}

  async logout(userId: number, refreshToken: string): Promise<void> {
    const { prisma } = this.authService;
    // 1. On récupère TOUS les tokens de refresh de cet utilisateur
    // (Car il peut être connecté sur son téléphone, son PC, sa tablette...)
    const tokens = await prisma.refreshToken.findMany({
      where: { userId },
    });

    // 2. On doit trouver LEQUEL correspond à celui qu'on veut déconnecter.
    // Comme les tokens sont hashés en base (argon2), on ne peut pas faire une recherche directe.
    // On est obligé de boucler et de vérifier les hashs un par un.
    for (const t of tokens) {
      if (await verify(t.hashedToken, refreshToken)) {
        // 3. On a trouvé le token correspondant.
        // On le supprime de la base de données.
        // Résultat : Ce token ne pourra plus jamais être utilisé pour rafraîchir la session.
        await prisma.refreshToken.delete({ where: { id: t.id } });
        break; // On arrête la boucle, le travail est fini.
      }
    }
  }
}
