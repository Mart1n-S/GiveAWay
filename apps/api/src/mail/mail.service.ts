import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Wrapper HTML moderne (Design épuré sans images)
   */
  private getEmailWrapper(content: string): string {
    return `
    <html>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 40px 32px 20px 32px; text-align: center;">
                    <div style="display: inline-block; padding: 10px 20px; background-color: #fff7ed; border-radius: 12px;">
                       <span style="color: #cc460f; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">GiveAWay</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 40px 40px; color: #334155; font-size: 16px; line-height: 1.6;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px; background-color: #f8fafc; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0 0 8px 0;">🧡 <b>GiveAWay</b> — Agir ensemble, simplement.</p>
                    <p style="margin: 0;">© 2026 Tous droits réservés.</p>
                  </td>
                </tr>
              </table>
              <p style="margin-top: 24px; color: #94a3b8; font-size: 12px; text-align: center;">
                Ceci est un message automatique, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  }

  /**
   * Template pour la vérification d'email
   */
  private getVerificationTemplate(code: string, time: string): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Bienvenue parmi nous ! 👋</h1>
      <p style="text-align: center; margin-bottom: 32px;">Ravi de vous voir ! Pour activer votre compte et commencer à explorer les missions, utilisez le code ci-dessous :</p>
      
      <div style="background-color: #fff7ed; border: 2px dashed #fb923c; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 32px;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; color: #cc460f; letter-spacing: 8px; margin-left: 8px;">${code}</span>
      </div>
      
      <p style="font-size: 14px; text-align: center; color: #64748b; margin-bottom: 24px;">
        Ce code est valide jusqu'à <b style="color: #1e293b;">${time}</b> (15 minutes).
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Aucun compte ne sera créé sans cette validation.
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  /**
   * Template pour le Reset Password
   */
  private getResetPasswordTemplate(code: string, time: string): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Réinitialisation de mot de passe 🔒</h1>
      <p style="text-align: center; margin-bottom: 32px;">Nous avons reçu une demande de changement de mot de passe pour votre compte.</p>
      
      <div style="background-color: #fef2f2; border: 2px dashed #fb923c; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; color: #cc460f; letter-spacing: 10px; margin-left: 10px;">${code}</span>
      </div>
      
      <p style="font-size: 14px; text-align: center; color: #64748b; margin-bottom: 24px;">
        Pour votre sécurité, ce code expirera à <b style="color: #1e293b;">${time}</b>.
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet email. Votre mot de passe actuel restera inchangé.
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  private async sendApiEmail(to: string, subject: string, htmlContent: string) {
    const apiKey =
      this.config.get<string>('BREVE_API_KEY') ||
      this.config.get<string>('BREVO_API_KEY');
    const senderEmail = this.config.get<string>('MAIL_FROM_EMAIL');
    const brevoUrl = this.config.get<string>('BREVO_URL');

    if (!brevoUrl) {
      throw new InternalServerErrorException('BREVO_URL non configurée');
    }

    const response = await fetch(brevoUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GiveAWay', email: senderEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Brevo API Error:', errorData);
      throw new InternalServerErrorException("Échec de l'envoi de l'email");
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(`\n📨 [MAIL SERVICE] Vérification d'email pour : ${email}`);
      console.log(`🔢 Code de validation : ${code}`);
      console.log(`⏳ Expire dans : 15 minutes\n`);
      // Simulation d'attente (IO)
      return await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const expiresAt = new Date(Date.now() + 15 * 60000).toLocaleTimeString(
      'fr-FR',
      { hour: '2-digit', minute: '2-digit' },
    );
    const html = this.getVerificationTemplate(code, expiresAt);
    return this.sendApiEmail(email, 'Bienvenue chez GiveAWay ! 🧡', html);
  }

  private getAssociationVerificationTemplate(
    associationName: string,
    code: string,
    time: string,
  ): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Bienvenue sur GiveAWay ! 🏢</h1>
      <p style="text-align: center; margin-bottom: 16px;">
        Nous avons bien reçu la demande d'inscription de l'association <b>${associationName}</b>.
      </p>
      <p style="text-align: center; margin-bottom: 32px;">
        Pour activer votre compte et finaliser l'inscription, utilisez le code ci-dessous :
      </p>

      <div style="background-color: #fff7ed; border: 2px dashed #fb923c; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 32px;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; color: #cc460f; letter-spacing: 8px; margin-left: 8px;">${code}</span>
      </div>

      <p style="font-size: 14px; text-align: center; color: #64748b; margin-bottom: 24px;">
        Ce code est valide jusqu'à <b style="color: #1e293b;">${time}</b> (15 minutes).
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  private getAssociationPendingReviewTemplate(associationName: string): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Dossier reçu, en cours d'examen 🔍</h1>
      <p style="text-align: center; margin-bottom: 24px;">
        Nous avons bien reçu la demande d'inscription de l'association <b>${associationName}</b>.
      </p>
      <p style="text-align: center; margin-bottom: 32px;">
        Votre dossier nécessite une vérification manuelle par notre équipe. Nous reviendrons vers vous sous quelques jours ouvrés.
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  async sendAssociationVerificationEmail(
    email: string,
    associationName: string,
    code: string,
  ) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Vérification email association pour : ${email}`,
      );
      console.log(`🏢 Association : ${associationName}`);
      console.log(`🔢 Code de validation : ${code}`);
      console.log(`⏳ Expire dans : 15 minutes\n`);
      return await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const expiresAt = new Date(Date.now() + 15 * 60000).toLocaleTimeString(
      'fr-FR',
      { hour: '2-digit', minute: '2-digit' },
    );
    const html = this.getAssociationVerificationTemplate(
      associationName,
      code,
      expiresAt,
    );
    return this.sendApiEmail(
      email,
      'Activez le compte de votre association GiveAWay 🧡',
      html,
    );
  }

  async sendAssociationPendingReviewEmail(
    email: string,
    associationName: string,
  ) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Dossier association en revue manuelle pour : ${email}`,
      );
      console.log(`🏢 Association : ${associationName}\n`);
      return await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const html = this.getAssociationPendingReviewTemplate(associationName);
    return this.sendApiEmail(
      email,
      "Votre dossier GiveAWay est en cours d'examen 🔍",
      html,
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Réinitialisation de mot de passe pour : ${email}`,
      );
      console.log(`🔢 Code de réinitialisation : ${token}`);
      console.log(`⏳ Expire dans : 15 minutes\n`);
      return await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const expiresAt = new Date(Date.now() + 15 * 60000).toLocaleTimeString(
      'fr-FR',
      { hour: '2-digit', minute: '2-digit' },
    );
    const html = this.getResetPasswordTemplate(token, expiresAt);
    return this.sendApiEmail(
      email,
      'Code de récupération de mot de passe 🔒',
      html,
    );
  }
}
