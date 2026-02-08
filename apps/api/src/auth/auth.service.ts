import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { hash, verify } from 'argon2';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import {
  UserStatus,
  RefreshToken,
  TokenType,
} from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
  ChangePasswordDto,
  User,
  UserStatus as SharedUserStatus,
  AssociationRole as SharedAssociationRole,
} from '@repo/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  // ----------------------------------------------------------------
  // REGISTER
  // ----------------------------------------------------------------
  async register(dto: RegisterDto) {
    // 1. Vérifier si l'email est déjà pris
    await this.checkEmailAvailability(dto.email);

    // 2. Hasher le mot de passe
    const hashedPassword = await hash(dto.password);

    // 3. Création du User (SANS le token, car on le gère à part maintenant)
    const newUser = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        age: dto.age,
        biography: dto.biography,
        profilePicture: dto.profilePicture,
        password: hashedPassword, // Mot de passe hashé Argon2
        emailVerifiedAt: null,
        status: UserStatus.PENDING,

        // Création de l'adresse liée
        address: {
          create: {
            street: dto.address.street,
            postalCode: dto.address.postalCode,
            city: dto.address.city,
            latitude: dto.address.latitude,
            longitude: dto.address.longitude,
          },
        },
      },
    });

    // 4. Génération et Sauvegarde du Token (Via notre Helper)
    // Cela crée l'entrée dans la table Token avec expiration +15min
    const rawToken = await this.generateAndSaveToken(
      newUser.id,
      TokenType.EMAIL_VERIFICATION,
    );

    // 5. Envoi Email
    await this.mailService.sendVerificationEmail(dto.email, rawToken);

    // 6. Réponse succès
    return {
      message:
        'Inscription réussie ! Veuillez vérifier vos emails pour activer votre compte (Lien valide 15 min).',
    };
  }

  // ----------------------------------------------------------------
  // VERIFY EMAIL
  // ----------------------------------------------------------------
  async verifyEmail(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 1. On cherche dans la table Token
    const dbToken = await this.prisma.token.findUnique({
      where: { token: hashedToken },
    });

    // 2. Vérifications
    if (!dbToken || dbToken.type !== TokenType.EMAIL_VERIFICATION) {
      throw new UnauthorizedException('Lien de validation invalide');
    }

    if (dbToken.expiresAt < new Date()) {
      // Nettoyage optionnel ici (ou via un cron job)
      await this.prisma.token.delete({ where: { id: dbToken.id } });
      throw new UnauthorizedException('Le lien a expiré');
    }

    // 3. Validation de l'utilisateur
    await this.prisma.user.update({
      where: { id: dbToken.userId },
      data: {
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    // 4. Nettoyage : On supprime le token utilisé
    await this.prisma.token.delete({
      where: { id: dbToken.id },
    });

    return {
      message:
        'Email validé avec succès ! Vous pouvez maintenant vous connecter',
    };
  }

  // ----------------------------------------------------------------
  // RESEND VERIFICATION EMAIL
  // ----------------------------------------------------------------
  async resendVerificationEmail(dto: ResendVerificationDto) {
    const genericMessage = {
      message:
        "Si cet email existe et n'est pas déjà validé, un nouveau lien a été envoyé.",
    };

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Sécurité (Anti-énumération) + Vérif si déjà validé
    if (!user || user.emailVerifiedAt) {
      return genericMessage;
    }

    // 1. Génération et Sauvegarde du nouveau Token
    // Le helper supprime automatiquement les anciens tokens avant d'en créer un nouveau
    const rawToken = await this.generateAndSaveToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
    );

    // 2. Envoi Email
    await this.mailService.sendVerificationEmail(user.email, rawToken);

    return genericMessage;
  }

  // ----------------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------------
  async login(dto: LoginDto, userAgent: string, ip: string) {
    // 1. Chercher l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        address: true,
        associations: {
          include: {
            association: true, // Pour avoir le nom de l'asso
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 2. Vérifier si l'email a été validé
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Veuillez valider votre email avant de vous connecter',
      );
    }

    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException(
        'Votre compte a été supprimé ou suspendu. Veuillez contacter le support.',
      );
    }

    // 3. Vérifier le mot de passe
    const isMatch = await verify(user.password, dto.password);

    if (!isMatch) {
      // On loggue l'échec (Super utile pour fail2ban ou le débug)
      this.logger.warn(
        `Tentative de connexion échouée pour l'email : ${dto.email}`,
      );
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ip);

    // return tokens;
    // 4. MAPPING : On nettoie l'objet pour le front
    // On enlève le mot de passe, les champs internes, etc.
    const userResponse: User = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      biography: user.biography,
      profilePicture: user.profilePicture,
      status: user.status as unknown as SharedUserStatus,

      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),

      address: user.address
        ? {
            id: user.address.id,
            street: user.address.street,
            postalCode: user.address.postalCode,
            city: user.address.city,
            latitude: user.address.latitude
              ? Number(user.address.latitude)
              : null,
            longitude: user.address.longitude
              ? Number(user.address.longitude)
              : null,
          }
        : null,
      // Si c'est un membre d'une asso, on inclut les infos d'association
      associations: user.associations.map((assocUser) => ({
        associationId: assocUser.associationId,
        name: assocUser.association.name,
        role: assocUser.role as unknown as SharedAssociationRole,
      })),
    };

    return { tokens, user: userResponse };
  }

  // ----------------------------------------------------------------
  // FORGOT PASSWORD
  // ----------------------------------------------------------------
  async forgotPassword(dto: ForgotPasswordDto) {
    const genericMessage = {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };

    // 1. Chercher l'utilisateur via dto.email
    const user = await this.prisma.user.findUnique({
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
    const rawToken = await this.generateAndSaveToken(
      user.id,
      TokenType.PASSWORD_RESET,
    );

    // 4. Envoi de l'email
    await this.mailService.sendPasswordResetEmail(user.email, rawToken);

    return genericMessage;
  }

  // ----------------------------------------------------------------
  // RESET PASSWORD (Effectif)
  // ----------------------------------------------------------------
  async resetPassword(dto: ResetPasswordDto) {
    // 1. On re-hash le token reçu pour le comparer à la BDD
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    // 2. On cherche le token en base
    const dbToken = await this.prisma.token.findUnique({
      where: { token: hashedToken },
    });

    if (!dbToken || dbToken.type !== TokenType.PASSWORD_RESET) {
      this.logger.warn('Tentative de reset password avec token invalide');
      throw new UnauthorizedException('Lien invalide ou déjà utilisé');
    }

    // 3. Vérification expiration
    if (dbToken.expiresAt < new Date()) {
      this.logger.warn(
        `Tentative de reset avec token expiré (userId: ${dbToken.userId})`,
      );
      await this.prisma.token.delete({ where: { id: dbToken.id } });
      throw new UnauthorizedException('Le lien a expiré');
    }

    // 4. Hashage du nouveau mot de passe
    const hashedPassword = await hash(dto.password);

    // 5. Mise à jour de l'utilisateur
    await this.prisma.user.update({
      where: { id: dbToken.userId },
      data: {
        password: hashedPassword,
      },
    });

    // 6. SÉCURITÉ : Nettoyage complet
    // a) On supprime le token de reset utilisé
    await this.prisma.token.delete({ where: { id: dbToken.id } });

    // b) CRITIQUE : On supprime TOUS les RefreshTokens de cet utilisateur.
    // Pourquoi ? Si un pirate avait accès au compte, il est maintenant déconnecté de partout.
    // L'utilisateur devra se reloguer avec son nouveau mot de passe.
    await this.prisma.refreshToken.deleteMany({
      where: { userId: dbToken.userId },
    });

    // On loggue l'événement important
    this.logger.log(
      `Mot de passe réinitialisé pour l'utilisateur ID : ${dbToken.userId};`,
    );

    return {
      message: 'Mot de passe modifié avec succès. Vous pouvez vous connecter.',
    };
  }

  // ----------------------------------------------------------------
  // CHANGE PASSWORD (Utilisateur connecté)
  // ----------------------------------------------------------------
  async changePassword(userId: number, dto: ChangePasswordDto) {
    // 1. Récupérer l'utilisateur pour avoir son mot de passe actuel hashé
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    // 2. Vérifier que l'ANCIEN mot de passe est correct
    const isPasswordValid = await verify(user.password, dto.oldPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Ancien mot de passe incorrect');
    }

    // 3. Hasher le NOUVEAU mot de passe
    const newHashedPassword = await hash(dto.newPassword);

    // 4. Mise à jour en base
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    // 5. SÉCURITÉ : On révoque les sessions (Refresh Tokens)
    // L'utilisateur devra se reconnecter s'il perd son Access Token actuel
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // On loggue l'événement important
    this.logger.log(
      `Mot de passe mis à jour pour l'utilisateur ID : ${userId};`,
    );

    return { message: 'Mot de passe modifié avec succès' };
  }

  // ----------------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------------
  async logout(userId: number, refreshToken: string) {
    // 1. On récupère TOUS les tokens de refresh de cet utilisateur
    // (Car il peut être connecté sur son téléphone, son PC, sa tablette...)
    const tokens = await this.prisma.refreshToken.findMany({
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
        await this.prisma.refreshToken.delete({ where: { id: t.id } });
        break; // On arrête la boucle, le travail est fini.
      }
    }
  }

  // ----------------------------------------------------------------
  // REFRESH TOKENS
  // ----------------------------------------------------------------
  async refreshTokens(
    userId: number,
    incomingRefreshToken: string,
    userAgent: string,
    ip: string,
  ) {
    // 1. Comme pour le logout, on récupère tous les tokens de l'user
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
    });

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
      // Nettoyage : On supprime ce token périmé pour ne pas encombrer la BDD
      await this.prisma.refreshToken.delete({ where: { id: tokenRow.id } });
      throw new ForbiddenException('Refresh token expiré');
    }

    // 5. ROTATION
    // On supprime l'ancien token utilisé. Il ne doit servir qu'UNE SEULE FOIS.
    await this.prisma.refreshToken.delete({ where: { id: tokenRow.id } });

    // 6. On vérifie que l'utilisateur existe toujours (au cas où il a été supprimé entre temps)
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
    });

    if (!user) {
      throw new ForbiddenException('Utilisateur introuvable ou compte inactif');
    }

    // 7. On génère un tout nouveau couple (Access + Refresh)
    const newTokens = await this.generateTokens(user.id, user.email);
    // 8. On sauvegarde le NOUVEAU refresh token en base
    await this.saveRefreshToken(user.id, newTokens.refreshToken, userAgent, ip);

    return newTokens;
  }

  // ----------------------------------------------------------------
  // GET PROFILE (ME)
  // ----------------------------------------------------------------
  async getMe(userId: number) {
    // 1. Chercher l'utilisateur avec ses relations
    // Exactement comme le login, mais par ID (garanti par le token)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        associations: {
          include: {
            association: true, // Pour avoir le nom de l'asso
          },
        },
      },
    });

    // 2. Vérifications de sécurité
    // Même si le token est valide, l'user a pu être supprimé entre temps
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Si un admin a banni l'user pendant sa session, on le bloque ici
    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException(
        'Votre compte a été supprimé ou suspendu.',
      );
    }

    // 3. MAPPING : On reprend la logique EXACTE du login
    // Cela garantit la cohérence des données User côté Front
    const userResponse: User = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      biography: user.biography,
      profilePicture: user.profilePicture,
      // On caste l'enum Prisma vers l'enum Shared
      status: user.status as unknown as SharedUserStatus,

      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),

      address: user.address
        ? {
            id: user.address.id,
            street: user.address.street,
            postalCode: user.address.postalCode,
            city: user.address.city,
            latitude: user.address.latitude
              ? Number(user.address.latitude)
              : null,
            longitude: user.address.longitude
              ? Number(user.address.longitude)
              : null,
          }
        : null,

      associations: user.associations.map((assocUser) => ({
        associationId: assocUser.associationId,
        name: assocUser.association.name,
        role: assocUser.role as unknown as SharedAssociationRole,
      })),
    };

    return userResponse;
  }

  // ----------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------
  /**
   * Vérifie simplement si un email est déjà pris.
   * Utilise 'select' pour être ultra-rapide (ne charge pas tout le user).
   */
  async checkEmailAvailability(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      throw new ConflictException('Cet email est déjà utilisé');
    }
  }

  // Cette fonction génère les signatures cryptographiques JWT
  private async generateTokens(userId: number, email: string) {
    try {
      const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
      const refreshSecret =
        this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

      // On force le typage pour dire à TypeScript que ce sont bien des formats valides pour JWT (ex: "15m", "7d")
      const accessExpires = this.config.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as SignOptions['expiresIn'];

      const refreshExpires = this.config.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as SignOptions['expiresIn'];

      // Promise.all permet de générer les deux tokens EN PARALLÈLE (plus rapide)
      // au lieu d'attendre l'un après l'autre.
      const [accessToken, refreshToken] = await Promise.all([
        // Token d'accès (courte durée, sert aux requêtes API)
        this.jwtService.signAsync(
          { sub: userId.toString(), email },
          {
            secret: accessSecret,
            expiresIn: accessExpires,
          },
        ),
        // Token de rafraîchissement (longue durée, sert à obtenir un nouveau token d'accès)
        this.jwtService.signAsync(
          { sub: userId.toString(), email },
          {
            secret: refreshSecret,
            expiresIn: refreshExpires,
          },
        ),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la génération des JWT pour userId ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // Cette fonction gère le stockage sécurisé en BDD
  private async saveRefreshToken(
    userId: number,
    token: string,
    userAgent: string,
    ip: string,
  ) {
    try {
      // 1. SÉCURITÉ : On hashe le token avant de l'écrire.
      const hashedToken = await hash(token);

      // 2. On calcule la date d'expiration (+7 jours)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 3. On insère dans la table RefreshToken
      await this.prisma.refreshToken.create({
        data: {
          userId,
          hashedToken,
          expiresAt,
          userAgent,
          ip,
        },
      });
    } catch (error) {
      this.logger.error(
        `Impossible de sauvegarder le refresh token pour userId ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Méthode utilitaire pour générer et sauvegarder un token (Email ou Reset Password)
   * Durée de validité : 15 minutes.
   */
  private async generateAndSaveToken(
    userId: number,
    type: TokenType,
  ): Promise<string> {
    try {
      // 1. Nettoyage : On supprime les anciens tokens de ce type pour cet user
      // Cela garantit qu'il n'y a toujours qu'un seul token valide par type.
      await this.prisma.token.deleteMany({
        where: { userId, type },
      });

      // 2. Génération du token brut (celui qu'on envoie par mail)
      const rawToken = crypto.randomBytes(32).toString('hex');

      // 3. Hashage pour la BDD
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      // 4. Calcul de l'expiration (15 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // 5. Sauvegarde
      await this.prisma.token.create({
        data: {
          token: hashedToken,
          type: type,
          expiresAt: expiresAt,
          userId: userId,
        },
      });

      // On retourne le token brut pour pouvoir l'envoyer par email
      return rawToken;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la génération du token ${type} pour userId ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
