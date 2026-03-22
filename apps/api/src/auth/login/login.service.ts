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
    // Le Web Client ID est utilisé pour initialiser le client OAuth2
    // La vérification multi-audience se fait dans verifyIdToken()
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_WEB_ID'),
    );
  }

  /**
   * Authentifie un utilisateur via email et mot de passe.
   *
   * @param dto - Identifiants de connexion (email + password)
   * @param res - Réponse Express pour poser les cookies d'auth
   * @param userAgent - User-Agent du client pour la session
   * @param ip - Adresse IP du client pour la session
   * @param clientType - Type de client ('web' | 'mobile')
   * @returns Les tokens JWT et les informations de l'utilisateur
   * @throws BadRequestException si l'email ou le mot de passe est incorrect
   * @throws ForbiddenException si le compte est suspendu, supprimé ou l'email non vérifié
   */
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
    const isMatch = await verify(user.password, dto.password as string);
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

  /**
   * Authentifie un utilisateur via Google OAuth.
   *
   * Gère deux cas selon la plateforme :
   * - **Web** : Google renvoie un `access_token` → on appelle l'endpoint UserInfo de Google
   * - **Mobile** (iOS/Android) : Google renvoie un `id_token` JWT → on le vérifie via `google-auth-library`
   *
   * Si l'utilisateur n'existe pas en base, son compte est créé automatiquement.
   * Si l'utilisateur existe via email sans googleId, on lie son compte Google.
   *
   * @param dto - DTO contenant le token Google et le flag `isAccessToken`
   * @param res - Réponse Express pour poser les cookies d'auth
   * @param userAgent - User-Agent du client pour la session
   * @param ip - Adresse IP du client pour la session
   * @param clientType - Type de client ('web' | 'mobile')
   * @returns Les tokens JWT et les informations de l'utilisateur
   * @throws UnauthorizedException si le token Google est invalide
   * @throws BadRequestException si l'email ou le googleId est absent du payload
   * @throws ForbiddenException si le compte est suspendu ou supprimé
   */
  async googleLogin(
    dto: GoogleLoginDto,
    res: Response,
    userAgent: string,
    ip: string,
    clientType?: string,
  ): Promise<AuthResponse> {
    const { prisma, logger } = this.authService;

    try {
      let email: string | undefined;
      let googleId: string | undefined;
      let given_name: string | undefined;
      let family_name: string | undefined;
      let picture: string | undefined;

      if (dto.isAccessToken) {
        // Cas Web : Google ne renvoie pas d'id_token via expo-auth-session
        // On échange l'access_token contre les infos utilisateur via UserInfo
        const userInfoUrl = this.config.get<string>(
          'PUBLIC_GOOGLE_USERINFO_URL',
        );

        if (!userInfoUrl) {
          throw new UnauthorizedException(
            'PUBLIC_GOOGLE_USERINFO_URL non configurée',
          );
        }

        const userInfoRes = await fetch(userInfoUrl, {
          headers: { Authorization: `Bearer ${dto.idToken}` },
        });

        if (!userInfoRes.ok) {
          throw new UnauthorizedException(
            `Google UserInfo a échoué: HTTP ${userInfoRes.status}`,
          );
        }

        const userInfo = await userInfoRes.json();

        email = userInfo.email;
        googleId = userInfo.sub;
        given_name = userInfo.given_name;
        family_name = userInfo.family_name;
        picture = userInfo.picture;
      } else {
        // Cas Mobile (iOS/Android) : @react-native-google-signin renvoie un id_token JWT
        // On accepte les tokens émis par n'importe lequel de nos 3 clients OAuth
        const validAudiences = [
          this.config.get<string>('GOOGLE_CLIENT_WEB_ID'),
          this.config.get<string>('GOOGLE_IOS_CLIENT_ID'),
          this.config.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
        ].filter((id): id is string => !!id);

        const ticket = await this.googleClient.verifyIdToken({
          idToken: dto.idToken,
          audience: validAudiences,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new UnauthorizedException(
            'Token Google invalide (payload vide)',
          );
        }

        email = payload.email;
        googleId = payload.sub;
        given_name = payload.given_name;
        family_name = payload.family_name;
        picture = payload.picture;
      }

      if (!email || !googleId) {
        throw new BadRequestException('Email ou identifiant Google non fourni');
      }

      const include = {
        address: true,
        associations: { include: { association: true } },
      };

      // Recherche par googleId en priorité, puis par email en fallback
      // pour gérer le cas d'un compte existant créé avant l'OAuth Google
      let user = (await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
        include,
      })) as UserWithRelations | null;

      if (!user) {
        // Nouvel utilisateur : création automatique du compte
        // L'email est considéré vérifié car Google l'a lui-même validé
        user = (await prisma.user.create({
          data: {
            email,
            googleId,
            firstName:
              given_name || `Bénévole-${Math.floor(Math.random() * 10000)}`,
            lastName: (family_name || 'Nom').toUpperCase(),
            profilePicture: picture,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            termsAcceptedAt: new Date(),
          },
          include,
        })) as UserWithRelations;
      } else if (!user.googleId) {
        // Compte existant créé via email/password : on lie le googleId
        // et on profite de la liaison pour valider l'email si nécessaire
        user = (await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          },
          include,
        })) as UserWithRelations;
      }

      if (
        user.status === UserStatus.DELETED ||
        user.status === UserStatus.SUSPENDED
      ) {
        throw new ForbiddenException(
          'Votre compte a été supprimé ou suspendu. Veuillez contacter le support.',
        );
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
    } catch (error) {
      // On laisse remonter les erreurs métier qu'on a levées nous-mêmes
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Toute autre erreur (réseau Google, token malformé, etc.)
      logger.error(
        `Erreur critique Google Auth: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
      throw new UnauthorizedException("Échec de l'authentification Google");
    }
  }
}
