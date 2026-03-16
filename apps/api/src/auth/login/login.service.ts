import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';
import { LoginDto, GoogleLoginDto, AuthResponse } from '@repo/shared';
import { UserStatus } from '../../generated/prisma/client';
import { AuthService, UserWithRelations } from '../auth.service';
import { CookieService } from '../shared/cookie.service';
import { buildAuthResponse } from '../shared/token-response.helper';

@Injectable()
export class LoginService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async login(
    dto: LoginDto,
    res: Response,
    userAgent: string,
    ip: string,
    clientType?: string,
  ): Promise<AuthResponse> {
    const { prisma, logger } = this.authService;

    // 1. Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        address: true,
        associations: { include: { association: true } },
      },
    });

    if (!user) {
      throw new BadRequestException('Email ou mot de passe incorrect');
    }

    // 2. Vérifier si l'email a été validé
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Veuillez valider votre email avant de vous connecter',
      );
    }

    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new ForbiddenException(
        'Votre compte a été supprimé ou suspendu. Veuillez contacter le support.',
      );
    }

    // 3. Vérifier le mot de passe
    const isMatch = await verify(user.password, dto.password);
    if (!isMatch) {
      // On loggue l'échec (Super utile pour fail2ban ou le débug)
      logger.warn(`Tentative de connexion échouée pour l'email : ${dto.email}`);
      throw new BadRequestException('Email ou mot de passe incorrect');
    }

    const tokens = await this.authService.generateTokens(user.id, user.email);
    await this.authService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      userAgent,
      ip,
    );

    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return buildAuthResponse(
      clientType,
      this.authService.mapUserToResponse(user),
      tokens.accessToken,
      tokens.refreshToken,
      'Connexion réussie',
    );
  }

  async googleLogin(
    dto: GoogleLoginDto,
    res: Response,
    userAgent: string,
    ip: string,
    clientType?: string,
  ): Promise<AuthResponse> {
    const { prisma, logger } = this.authService;

    try {
      // 1. Vérifier le token auprès de Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Token Google invalide (payload vide)');
      }

      const {
        email,
        given_name,
        family_name,
        picture,
        email_verified,
        sub: googleId,
      } = payload;

      if (!email) {
        throw new BadRequestException('Email non fourni par Google');
      }

      const include = {
        address: true,
        associations: { include: { association: true } },
      };

      // 2. Chercher l'utilisateur par googleId OU par email
      let user = (await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
        include,
      })) as UserWithRelations | null;

      // 3. Logique d'Inscription / Mise à jour
      if (!user) {
        // Cas A : L'utilisateur n'existe pas du tout -> Inscription
        user = (await prisma.user.create({
          data: {
            email,
            googleId,
            firstName:
              given_name || `Bénévole-${Math.floor(Math.random() * 10000)}`,
            lastName: (family_name || 'Nom').toUpperCase(),
            profilePicture: picture,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: email_verified ? new Date() : new Date(),
          },
          include,
        })) as UserWithRelations;
      } else if (!user.googleId) {
        // Cas B : L'utilisateur existe (email) mais n'avait jamais lié son compte Google
        user = (await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include,
        })) as UserWithRelations;
      }

      // 4. Vérifier le statut
      if (
        user.status === UserStatus.DELETED ||
        user.status === UserStatus.SUSPENDED
      ) {
        throw new ForbiddenException(
          'Votre compte a été supprimé ou suspendu. Veuillez contacter le support.',
        );
      }

      // 5. Générer les tokens et mapper la réponse
      const tokens = await this.authService.generateTokens(user.id, user.email);
      await this.authService.saveRefreshToken(
        user.id,
        tokens.refreshToken,
        userAgent,
        ip,
      );

      this.cookieService.setAuthCookies(
        res,
        tokens.accessToken,
        tokens.refreshToken,
      );

      return buildAuthResponse(
        clientType,
        this.authService.mapUserToResponse(user),
        tokens.accessToken,
        tokens.refreshToken,
        'Connexion réussie',
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      logger.error(
        `Erreur Google Auth: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
      throw new UnauthorizedException("Échec de l'authentification Google");
    }
  }
}
