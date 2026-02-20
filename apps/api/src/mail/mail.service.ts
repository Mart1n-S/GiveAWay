import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter;

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
  async sendVerificationEmail(email: string, code: string) {
    console.log(`\n📨 [MAIL SERVICE] Vérification d'email pour : ${email}`);
    console.log(`🔢 Code de validation : ${code}`);
    console.log(`⏳ Expire dans : 15 minutes\n`);

    // Simulation d'attente (IO)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // En vrai production, on ferait :
    /*
        await this.transporter.sendMail({
          from: '"GiveAway Team" <no-reply@giveaway.com>',
          to: email,
          subject: 'Votre code de validation GiveAway',
          html: `
            <div style="font-family: sans-serif; text-align: center;">
              <h2>Bienvenue sur GiveAway !</h2>
              <p>Pour finaliser votre inscription, veuillez entrer le code suivant dans l'application :</p>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #CC460F; margin: 20px 0;">
                ${code}
              </p>
              <p>Ce code est valide pendant 15 minutes.</p>
            </div>
          `,
        });
    */
  }

  // Email de réinitialisation du mot de passe (Mot de passe oublié)
  async sendPasswordResetEmail(email: string, token: string) {
    console.log(
      `\n📨 [MAIL SERVICE] Réinitialisation de mot de passe pour : ${email}`,
    );
    console.log(`🔢 Code de réinitialisation : ${token}`);
    console.log(`⏳ Expire dans : 15 minutes\n`);

    // Simulation d'attente (IO)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // En vrai production, on ferait :
    /*
        await this.transporter.sendMail({
          from: '"GiveAway Team" <no-reply@giveaway.com>',
          to: email,
          subject: 'Réinitialisation de votre mot de passe GiveAway',
          html: `
            <div style="font-family: sans-serif; text-align: center;">
              <h2>Réinitialisation de votre mot de passe</h2>
              <p>Pour réinitialiser votre mot de passe, veuillez entrer le code suivant dans l'application :</p>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #CC460F; margin: 20px 0;">
                ${token}
              </p>
              <p>Ce code est valide pendant 15 minutes.</p>
            </div>
          `,
        });
    */
  }
}
