import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // Pour le dev, on simule juste (ou utilise Ethereal.email)
    // Plus tard, tu mettras ici tes identifiants Gmail ou Resend
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ton_user_test',
        pass: 'ton_pass_test',
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const url = `http://localhost:3000/auth/verify?token=${token}`;

    console.log(`📨 [MAIL SERVICE] Simulation d'envoi à : ${email}`);
    console.log(`🔑 Token (brut) : ${token}`);
    console.log(`🔗 Lien de validation : ${url}`);

    // On simule une attente de 1 seconde.
    // Ça enlève l'erreur "no await" et ça imite le temps d'envoi réel.
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
}
