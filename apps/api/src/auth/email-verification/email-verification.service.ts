import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { TokenType } from '../../generated/prisma/client';
import { UserStatus } from '../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';
import { ResendVerificationDto } from '@repo/shared';
import { AuthService } from '../auth.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async verifyEmail(code: string) {
    const { prisma } = this.authService;
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // 1. On cherche dans la table Token
    const dbToken = await prisma.token.findUnique({
      where: { token: hashedCode },
    });

    // 2. Vérifications
    if (!dbToken || dbToken.type !== TokenType.EMAIL_VERIFICATION) {
      throw new BadRequestException('Code de validation invalide');
    }

    if (dbToken.expiresAt < new Date()) {
      // Nettoyage optionnel ici (ou via un cron job)
      await prisma.token.delete({ where: { id: dbToken.id } });
      throw new BadRequestException('Le code a expiré');
    }

    // 3. Validation de l'utilisateur
    await prisma.user.update({
      where: { id: dbToken.userId },
      data: {
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    // 4. Nettoyage : On supprime le token utilisé
    await prisma.token.delete({
      where: { id: dbToken.id },
    });

    return {
      message:
        'Email validé avec succès ! Vous pouvez maintenant vous connecter.',
    };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const { prisma } = this.authService;

    const genericMessage = {
      message:
        "Si cet email existe et n'est pas déjà validé, un nouveau lien a été envoyé.",
    };

    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Sécurité (Anti-énumération) + Vérif si déjà validé
    if (!user || user.emailVerifiedAt) {
      return genericMessage;
    }

    // 1. Génération et Sauvegarde du nouveau Token
    // Le helper supprime automatiquement les anciens tokens avant d'en créer un nouveau
    const rawCode = await this.authService.generateAndSaveToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
    );

    // 2. Envoi Email
    await this.mailService.sendVerificationEmail(user.email, rawCode);

    return genericMessage;
  }
}
