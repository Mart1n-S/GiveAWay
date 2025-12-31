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
import { UserStatus, RefreshToken } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { RegisterDto, LoginDto } from '@repo/shared';

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
    // 1. Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }
    // 2. Hasher le mot de passe
    const hashedPassword = await hash(dto.password);

    // 3. Générer le token de vérification d'email
    // On génère une chaîne aléatoire (C'est celle-ci qu'on enverra par email)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // On la hashe en SHA-256 pour la stocker en base (Sécurité en cas de fuite de BDD)
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // 4. Création du User (Mapping explicite pour éviter les erreurs de types)
    // On ne stocke pas 'acceptTerms' (boolean), Prisma mettra la date automatiquement via @default(now())
    await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        age: dto.age,
        biography: dto.biography,
        profilePicture: dto.profilePicture,
        password: hashedPassword,

        // Gestion de la validation email
        verificationToken: hashedToken,
        emailVerifiedAt: null,
        status: UserStatus.pending,

        // Création de l'adresse liée via la relation Prisma
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

    // 5. Simulation envoi Email
    await this.mailService.sendVerificationEmail(dto.email, rawToken);

    // 6. On ne renvoie PAS de token JWT. On renvoie un message de succès.
    return {
      message:
        'Inscription réussie ! Veuillez vérifier vos emails pour activer votre compte.',
    };
  }

  // ----------------------------------------------------------------
  // VERIFY EMAIL
  // ----------------------------------------------------------------
  async verifyEmail(token: string) {
    // 1. On hashe le token reçu pour le comparer à celui en base
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. On cherche un utilisateur avec ce token
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: hashedToken },
    });

    if (!user) {
      throw new UnauthorizedException('Lien de validation invalide ou expiré.');
    }

    // 3. On valide l'email et on supprime le token (pour qu'il ne serve qu'une fois)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(), // Date de maintenant
        verificationToken: null,
        status: UserStatus.active,
      },
    });

    return {
      message:
        'Email validé avec succès ! Vous pouvez maintenant vous connecter.',
    };
  }

  // ----------------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------------
  async login(dto: LoginDto, userAgent: string, ip: string) {
    // 1. Chercher l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
      user.status == UserStatus.deleted ||
      user.status == UserStatus.suspended
    ) {
      throw new UnauthorizedException(
        'Votre compte a été supprimé ou suspendu. Veuillez contacter le support.',
      );
    }

    // 3. Vérifier le mot de passe
    const isMatch = await verify(user.password, dto.password);

    if (!isMatch) {
      // 2. On loggue l'échec (Super utile pour fail2ban ou le débug)
      this.logger.warn(
        `Tentative de connexion échouée pour l'email : ${dto.email}`,
      );
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ip);

    return tokens;
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
        status: UserStatus.active,
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
  // PRIVATE HELPERS
  // ----------------------------------------------------------------
  // Cette fonction génère les signatures cryptographiques JWT
  private async generateTokens(userId: number, email: string) {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

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
  }

  // Cette fonction gère le stockage sécurisé en BDD
  private async saveRefreshToken(
    userId: number,
    token: string,
    userAgent: string,
    ip: string,
  ) {
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
  }
}
