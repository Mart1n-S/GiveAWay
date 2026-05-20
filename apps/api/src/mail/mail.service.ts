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
                    <p style="margin: 0 0 8px 0;">🧡 <b>GiveAWay</b> - Agir ensemble, simplement.</p>
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
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const senderEmail = this.config.get<string>('MAIL_FROM_EMAIL');
    const brevoUrl = this.config.get<string>('BREVO_URL');

    console.log('BREVO_API_KEY:', apiKey);
    console.log('BREVO_URL:', brevoUrl);
    console.log('MAIL_FROM_EMAIL:', senderEmail);

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

  private getMissionDeletedTemplate(
    userName: string,
    missionTitle: string,
    associationName: string,
  ): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Mission annulée 📢</h1>
      <p style="text-align: center; margin-bottom: 24px;">Bonjour <b>${userName}</b>,</p>
      <p style="text-align: center; margin-bottom: 24px;">
        Nous vous informons que la mission <b>${missionTitle}</b> proposée par <b>${associationName}</b> a été annulée.
      </p>
      <p style="text-align: center; margin-bottom: 32px; color: #64748b;">
        Votre inscription à cette mission a été automatiquement supprimée. Nous vous invitons à consulter d'autres missions disponibles sur GiveAWay.
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Merci pour votre engagement bénévole !
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  private getMissionUpdatedTemplate(
    userName: string,
    missionTitle: string,
    associationName: string,
    changes: string[],
  ): string {
    const changesList = changes
      .map((c) => `<li style="margin-bottom: 8px; color: #334155;">${c}</li>`)
      .join('');

    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Mission modifiée ✏️</h1>
      <p style="text-align: center; margin-bottom: 24px;">Bonjour <b>${userName}</b>,</p>
      <p style="text-align: center; margin-bottom: 16px;">
        Des informations importantes concernant la mission <b>${missionTitle}</b> proposée par <b>${associationName}</b> ont été modifiées :
      </p>
      <ul style="margin: 0 0 32px 0; padding: 0 0 0 20px;">
        ${changesList}
      </ul>
      <p style="text-align: center; margin-bottom: 32px; color: #64748b;">
        Nous vous invitons à consulter les détails mis à jour directement sur GiveAWay.
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Merci pour votre engagement bénévole !
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  async sendMissionDeletedEmail(
    email: string,
    userName: string,
    missionTitle: string,
    associationName: string,
  ) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Mission supprimée - notif pour : ${email}`,
      );
      console.log(
        `📋 Mission : ${missionTitle} | Association : ${associationName}\n`,
      );
      return;
    }

    const html = this.getMissionDeletedTemplate(
      userName,
      missionTitle,
      associationName,
    );
    return this.sendApiEmail(
      email,
      `La mission "${missionTitle}" a été annulée`,
      html,
    );
  }

  async sendMissionUpdatedEmail(
    email: string,
    userName: string,
    missionTitle: string,
    associationName: string,
    changes: string[],
  ) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Mission modifiée - notif pour : ${email}`,
      );
      console.log(
        `📋 Mission : ${missionTitle} | Changements : ${changes.join(', ')}\n`,
      );
      return;
    }

    const html = this.getMissionUpdatedTemplate(
      userName,
      missionTitle,
      associationName,
      changes,
    );
    return this.sendApiEmail(
      email,
      `Mise à jour de la mission "${missionTitle}"`,
      html,
    );
  }

  private getParticipantRemovedTemplate(
    userName: string,
    missionTitle: string,
    associationName: string,
  ): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Retrait de la mission ❌</h1>
      <p style="text-align: center; margin-bottom: 24px;">Bonjour <b>${userName}</b>,</p>
      <p style="text-align: center; margin-bottom: 24px;">
        Nous vous informons que votre participation à la mission <b>${missionTitle}</b> proposée par <b>${associationName}</b> a été annulée par l'association.
      </p>
      <p style="text-align: center; margin-bottom: 32px; color: #64748b;">
        Si vous avez des questions, vous pouvez contacter directement l'association. Nous vous invitons à consulter d'autres missions disponibles sur GiveAWay.
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Merci pour votre engagement bénévole !
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  async sendParticipantRemovedEmail(
    email: string,
    userName: string,
    missionTitle: string,
    associationName: string,
  ) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Participant retiré - notif pour : ${email}`,
      );
      console.log(
        `📋 Mission : ${missionTitle} | Association : ${associationName}\n`,
      );
      return;
    }

    const html = this.getParticipantRemovedTemplate(
      userName,
      missionTitle,
      associationName,
    );
    return this.sendApiEmail(
      email,
      `Votre participation à "${missionTitle}" a été annulée`,
      html,
    );
  }

  private getNewMissionTemplate(
    userName: string,
    missionTitle: string,
    associationName: string,
  ): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Nouvelle mission disponible 🧡</h1>
      <p style="text-align: center; margin-bottom: 24px;">Bonjour <b>${userName}</b>,</p>
      <p style="text-align: center; margin-bottom: 24px;">
        L'association <b>${associationName}</b> que vous suivez vient de publier une nouvelle mission :
      </p>
      <div style="background-color: #fff7ed; border-left: 4px solid #cc460f; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px; text-align: left;">
        <p style="margin: 0; font-size: 17px; font-weight: 700; color: #1e293b;">${missionTitle}</p>
      </div>
      <p style="text-align: center; margin-bottom: 32px; color: #64748b;">
        Connectez-vous à GiveAWay pour consulter les détails.
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Vous recevez cet email car vous êtes abonné aux notifications de <b>${associationName}</b>.<br/>
        Vous pouvez gérer vos préférences dans votre profil GiveAWay.
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  async sendNewMissionEmail(
    email: string,
    userName: string,
    missionTitle: string,
    associationName: string,
  ) {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    ) {
      console.log(
        `\n📨 [MAIL SERVICE] Nouvelle mission - notif pour : ${email}`,
      );
      console.log(
        `📋 Mission : ${missionTitle} | Association : ${associationName}\n`,
      );
      return;
    }

    const html = this.getNewMissionTemplate(
      userName,
      missionTitle,
      associationName,
    );
    return this.sendApiEmail(
      email,
      `Nouvelle mission de ${associationName} 🧡`,
      html,
    );
  }

  // ============================================================
  // ===== ADMIN - Validation associations / users / admins =====
  // ============================================================

  private getSimpleTemplate(title: string, body: string): string {
    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">${title}</h1>
      <div style="text-align: center; margin-bottom: 24px;">${body}</div>
    `;
    return this.getEmailWrapper(content);
  }

  private isLogMode(): boolean {
    return (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('USE_DETERMINISTIC_OTP') === 'true'
    );
  }

  async sendAssociationValidatedEmail(email: string, associationName: string) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Association validée - ${associationName} → ${email}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Votre association a été validée ! 🎉',
      `<p>Bonjour,</p><p>L'association <b>${associationName}</b> vient d'être validée par notre équipe. Vous pouvez désormais publier vos missions sur GiveAWay.</p>`,
    );
    return this.sendApiEmail(
      email,
      `Votre association ${associationName} est validée`,
      html,
    );
  }

  async sendAssociationRejectedEmail(
    email: string,
    associationName: string,
    reason: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Association refusée - ${associationName} → ${email} | raison: ${reason}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Inscription refusée',
      `<p>Bonjour,</p>
       <p>Après examen, l'inscription de l'association <b>${associationName}</b> n'a pas pu être validée pour le moment.</p>
       <p><b>Motif :</b> ${reason}</p>
       <p>Notre équipe peut être amenée à reconsidérer votre demande. N'hésitez pas à nous contacter si vous souhaitez en discuter ou compléter votre dossier.</p>`,
    );
    return this.sendApiEmail(
      email,
      `Inscription refusée - ${associationName}`,
      html,
    );
  }

  async sendAssociationPurgedEmail(
    email: string,
    associationName: string,
    reason: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Association supprimée définitivement - ${associationName} → ${email}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Compte association supprimé',
      `<p>Bonjour,</p>
       <p>La fiche de l'association <b>${associationName}</b> a été supprimée définitivement de notre plateforme, ainsi que les justificatifs transmis.</p>
       ${reason ? `<p><b>Motif initial du refus :</b> ${reason}</p>` : ''}
       <p>Votre compte personnel <b>reste actif en tant que bénévole</b> : vous pouvez continuer à parcourir les missions proposées par les associations partenaires et y participer.</p>
       <p>Si vous pensez qu'il y a une erreur ou si vous souhaitez recréer une association, vous pouvez nous contacter ou soumettre une nouvelle demande d'inscription.</p>`,
    );
    return this.sendApiEmail(email, `Suppression de ${associationName}`, html);
  }

  async sendAssociationSuspendedEmail(
    email: string,
    associationName: string,
    reason: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Association suspendue - ${associationName} → ${email} | raison: ${reason}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Compte association suspendu',
      `<p>L'association <b>${associationName}</b> a été suspendue temporairement.</p><p><b>Motif :</b> ${reason}</p>`,
    );
    return this.sendApiEmail(email, `Suspension de ${associationName}`, html);
  }

  async sendAssociationDocumentsRequestEmail(
    email: string,
    associationName: string,
    types: string[],
    message: string | undefined,
    contactEmail: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Demande justificatifs - ${associationName} → ${email} | types: ${types.join(',')} | contact: ${contactEmail}\n`,
      );
      return;
    }
    const labels: Record<string, string> = {
      STATUTS: "Statuts de l'association",
      RNA_ATTESTATION: 'Attestation RNA / récépissé préfecture',
      OFFICE_PROOF: 'Justificatif de siège (bail, attestation, etc.)',
    };
    const list = types.map((t) => `<li>${labels[t] ?? t}</li>`).join('');
    const subject = `justificatifs association - ${associationName}`;
    const html = this.getSimpleTemplate(
      'Justificatifs demandés',
      `<p>Bonjour,</p>
       <p>Pour valider l'association <b>${associationName}</b>, merci de nous faire parvenir les pièces justificatives suivantes :</p>
       <ul>${list}</ul>
       ${message ? `<p><b>Note de l'administrateur :</b> ${message}</p>` : ''}
       <p>Merci d'envoyer ces documents en pièce jointe à l'adresse <b><a href="mailto:${contactEmail}">${contactEmail}</a></b> en utilisant <b>exactement</b> l'objet suivant&nbsp;:</p>
       <p style="background:#fff7ed;border:1px dashed #fb923c;border-radius:8px;padding:12px;font-family:monospace;text-align:center;">${subject}</p>
       <p>Pensez à lister dans le corps du message les fichiers fournis (un par ligne) afin de faciliter le traitement.</p>
       <p>Une fois reçus et vérifiés, vos justificatifs seront déposés sur votre profil et notre équipe finalisera la validation de votre association.</p>`,
    );
    return this.sendApiEmail(
      email,
      `Justificatifs demandés - ${associationName}`,
      html,
    );
  }

  async sendMissionCancelledEmail(
    email: string,
    userName: string,
    missionTitle: string,
    associationName: string,
    reason: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Mission annulée (suppression asso) - ${missionTitle} → ${email}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Mission annulée',
      `<p>Bonjour ${userName},</p><p>La mission <b>${missionTitle}</b> à laquelle vous étiez inscrit n'aura pas lieu (${reason}).</p><p>L'association <b>${associationName}</b> n'est plus présente sur la plateforme.</p>`,
    );
    return this.sendApiEmail(email, `Mission "${missionTitle}" annulée`, html);
  }

  async sendAdminInvitationEmail(
    email: string,
    firstName: string,
    tempPassword: string,
    loginUrl: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Invitation admin - ${email} | password: ${tempPassword}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Bienvenue dans la team admin GiveAWay',
      `<p>Bonjour ${firstName},</p><p>Un compte admin vient d'être créé pour vous.</p><p><b>Identifiant :</b> ${email}<br/><b>Mot de passe temporaire :</b> <code style="background:#fff7ed;padding:4px 8px;border-radius:6px;">${tempPassword}</code></p><p>Connectez-vous et changez ce mot de passe immédiatement.</p><p><a href="${loginUrl}" style="background:#cc460f;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Se connecter</a></p>`,
    );
    return this.sendApiEmail(email, 'Votre compte admin GiveAWay', html);
  }

  async sendAdminPasswordResetEmail(
    email: string,
    firstName: string,
    tempPassword: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] Reset password admin - ${email} | password: ${tempPassword}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Réinitialisation de votre mot de passe admin',
      `<p>Bonjour ${firstName},</p><p>Votre mot de passe admin a été réinitialisé.</p><p><b>Nouveau mot de passe temporaire :</b> <code style="background:#fff7ed;padding:4px 8px;border-radius:6px;">${tempPassword}</code></p><p>Vous serez invité à le changer à votre prochaine connexion.</p>`,
    );
    return this.sendApiEmail(email, 'Mot de passe admin réinitialisé', html);
  }

  async sendUserCreatedByAdminEmail(
    email: string,
    firstName: string,
    tempPassword: string,
  ) {
    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL] User créé par admin - ${email} | password: ${tempPassword}\n`,
      );
      return;
    }
    const html = this.getSimpleTemplate(
      'Votre compte GiveAWay',
      `<p>Bonjour ${firstName},</p>
       <p>Un compte vient d'être créé pour vous sur <b>GiveAWay</b> par un administrateur.</p>
       <p><b>Votre mot de passe temporaire :</b> <code style="background:#fff7ed;padding:6px 10px;border-radius:6px;font-size:15px;">${tempPassword}</code></p>
       <p>Pour des raisons de sécurité, ce mot de passe est <b>temporaire</b>. Dès votre première connexion, nous vous invitons à :</p>
       <ol>
         <li><b>Changer votre mot de passe</b> depuis la page « Mot de passe oublié » ou les paramètres de votre profil.</li>
         <li><b>Compléter votre profil</b> (compétences, causes, disponibilités, photo) pour recevoir des recommandations de missions adaptées.</li>
       </ol>
       <p>À très vite sur GiveAWay 🧡</p>`,
    );
    return this.sendApiEmail(email, 'Bienvenue sur GiveAWay 🧡', html);
  }

  private getMissionReminderTemplate(
    userName: string,
    missions: Array<{
      title: string;
      startDate: Date;
      associationName: string;
    }>,
  ): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });

    const items = missions
      .map((m) => {
        const when = formatter.format(m.startDate);
        return `
          <li style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #fff7ed; border-left: 4px solid #cc460f; border-radius: 8px; list-style: none;">
            <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #1e293b;">${m.title}</p>
            <p style="margin: 0; font-size: 14px; color: #64748b;">${m.associationName} &ndash; ${when}</p>
          </li>
        `;
      })
      .join('');

    const intro =
      missions.length === 1
        ? "N'oubliez pas, vous avez une mission demain :"
        : `N'oubliez pas, vous avez ${missions.length} missions demain :`;

    const content = `
      <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Rappel de mission 🔔</h1>
      <p style="text-align: center; margin-bottom: 24px;">Bonjour <b>${userName}</b>,</p>
      <p style="text-align: center; margin-bottom: 24px;">${intro}</p>
      <ul style="margin: 0 0 32px 0; padding: 0;">${items}</ul>
      <p style="text-align: center; margin-bottom: 24px; color: #64748b;">
        Merci pour votre engagement bénévole !
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        Vous recevez ce rappel car vous avez activé les notifications par e-mail.<br/>
        Vous pouvez gérer vos préférences dans votre profil GiveAWay.
      </div>
    `;
    return this.getEmailWrapper(content);
  }

  async sendMissionReminderEmail(
    email: string,
    userName: string,
    missions: Array<{
      title: string;
      startDate: Date;
      associationName: string;
    }>,
  ) {
    if (missions.length === 0) return;

    if (this.isLogMode()) {
      console.log(
        `\n📨 [MAIL SERVICE] Rappel J-1 pour : ${email} (${missions.length} mission(s))`,
      );
      for (const m of missions) {
        console.log(
          `   • ${m.title} – ${m.associationName} – ${m.startDate.toISOString()}`,
        );
      }
      console.log('');
      return;
    }

    const subject =
      missions.length === 1
        ? `Rappel : ${missions[0].title} demain`
        : `Rappel : vous avez ${missions.length} missions demain`;

    const html = this.getMissionReminderTemplate(userName, missions);
    return this.sendApiEmail(email, subject, html);
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
