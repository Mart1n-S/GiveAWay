import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor(private readonly config: ConfigService) {
    // Configuration du transporteur (Mock pour le moment)
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ton_user_test',
        pass: 'ton_pass_test',
      },
    });
  }

  // Email de vérification (Inscription)
  async sendVerificationEmail(email: string, token: string) {
    // On récupère l'URL de l'API car la route /verify est une route Backend
    const apiUrl =
      this.config.get<string>('API_URL') || 'http://localhost:3000';

    // Le lien pointe vers le contrôleur API qui valide le token
    const url = `${apiUrl}/auth/verify?token=${token}`;

    console.log(`\n📨 [MAIL SERVICE] Vérification d'email pour : ${email}`);
    console.log(`🔑 Token (brut) : ${token}`);
    console.log(`🔗 Lien de validation : ${url}\n`);

    // Simulation d'attente (IO)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // En vrai production, on ferait :
    /*
        await this.transporter.sendMail({
          from: '"GiveAway Team" <no-reply@giveaway.com>',
          to: email,
          subject: 'Validez votre compte',
          html: `<p>Cliquez ici : <a href="${url}">Valider</a></p>`,
        });
        */
  }

  // Email de réinitialisation du mot de passe (Mot de passe oublié)
  async sendPasswordResetEmail(email: string, token: string) {
    // On récupère l'URL du FRONTEND car l'utilisateur doit arriver sur un formulaire
    // Exemple : "giveaway://reset-password" (Mobile) ou "https://app.com" (Web)
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    // Le lien pointe vers l'écran de changement de mot de passe du Front
    const url = `${frontendUrl}/reset-password?token=${token}`;

    console.log(`📧 [MAIL SERVICE] Reset Password pour : ${email}`);
    console.log(`🔑 Token (brut) : ${token}`);
    console.log(`🔗 Lien (Front) : ${url}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
