import { BadRequestException, Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import * as crypto from 'node:crypto';
import { TokenType, UserStatus } from '../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '@repo/shared';
import { AuthService } from '../auth.service';

@Injectable()
export class PasswordService {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const { prisma } = this.authService;
    const genericMessage = {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };

    // 1. Chercher l'utilisateur via dto.email
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 2. Anti-énumération & Vérification statut
    if (
      !user ||
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.PENDING
    ) {
      // Pour la sécurité, on fait semblant que tout s'est bien passé
      // On retourne le même message que si l'utilisateur existait
      return genericMessage;
    }

    // 3. Génération du token
    const rawToken = await this.authService.generateAndSaveToken(
      user.id,
      TokenType.PASSWORD_RESET,
    );

    // 4. Envoi de l'email
    await this.mailService.sendPasswordResetEmail(user.email, rawToken);

    return genericMessage;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { prisma, logger } = this.authService;

    // 1. On re-hash le code reçu pour le comparer à la BDD
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.code)
      .digest('hex');

    // 2. On cherche le token en base
    const dbToken = await prisma.token.findUnique({
      where: { token: hashedToken },
    });

    if (!dbToken || dbToken.type !== TokenType.PASSWORD_RESET) {
      logger.warn('Tentative de reset password avec un code invalide');
      throw new BadRequestException('Code invalide ou déjà utilisé');
    }

    // 3. Vérification expiration
    if (dbToken.expiresAt < new Date()) {
      logger.warn(
        `Tentative de reset avec un code expiré (userId: ${dbToken.userId})`,
      );
      await prisma.token.delete({ where: { id: dbToken.id } });
      throw new BadRequestException('Le code a expiré');
    }

    // 4. Hashage du nouveau mot de passe
    const hashedPassword = await hash(dto.password);

    // 5. Mise à jour de l'utilisateur
    await prisma.user.update({
      where: { id: dbToken.userId },
      data: {
        password: hashedPassword,
      },
    });

    // 6. SÉCURITÉ : Nettoyage complet
    // a) On supprime le token de reset utilisé
    await prisma.token.delete({ where: { id: dbToken.id } });

    // b) CRITIQUE : On supprime TOUS les RefreshTokens de cet utilisateur.
    // Pourquoi ? Si un pirate avait accès au compte, il est maintenant déconnecté de partout.
    // L'utilisateur devra se reloguer avec son nouveau mot de passe.
    await prisma.refreshToken.deleteMany({
      where: { userId: dbToken.userId },
    });

    // On loggue l'événement important
    logger.log(
      `Mot de passe réinitialisé pour l'utilisateur ID : ${dbToken.userId};`,
    );

    return {
      message: 'Mot de passe modifié avec succès. Vous pouvez vous connecter.',
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const { prisma, logger } = this.authService;
    // 1. Récupérer l'utilisateur pour avoir son mot de passe actuel hashé
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new BadRequestException('Utilisateur introuvable');

    // 2. Vérifier que l'ANCIEN mot de passe est correct
    const isPasswordValid = await verify(user.password, dto.oldPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    // 3. Hasher le NOUVEAU mot de passe
    const newHashedPassword = await hash(dto.newPassword);

    // 4. Mise à jour en base
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    // 5. SÉCURITÉ : On révoque les sessions (Refresh Tokens)
    // L'utilisateur devra se reconnecter s'il perd son Access Token actuel
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // On loggue l'événement important
    logger.log(`Mot de passe mis à jour pour l'utilisateur ID : ${userId};`);

    return { message: 'Mot de passe modifié avec succès' };
  }
}
