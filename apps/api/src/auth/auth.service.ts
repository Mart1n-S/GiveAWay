import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { hash } from 'argon2';
import * as crypto from 'node:crypto';
import { randomInt } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import {
  TokenType,
  User as PrismaUser,
  Address,
  AssociationUser,
  Association,
  UserSkill,
  Skill,
  UserCause,
  Cause,
  UserAvailability,
  MissionParticipant,
  Mission,
} from '../generated/prisma/client';
import {
  User,
  UserStatus as SharedUserStatus,
  AssociationRole as SharedAssociationRole,
} from '@repo/shared';

export type UserWithRelations = PrismaUser & {
  address?: Address | null;
  associations?: (AssociationUser & { association: Association })[];
  skills?: (UserSkill & { skill: Skill })[];
  causes?: (UserCause & { cause: Cause })[];
  availability?: UserAvailability | null;
  participations?: (MissionParticipant & {
    mission: Mission & { association: Association };
  })[];
};

@Injectable()
export class AuthService {
  readonly logger = new Logger(AuthService.name);

  constructor(
    readonly prisma: PrismaService,
    readonly jwtService: JwtService,
    readonly config: ConfigService,
  ) {}

  // ----------------------------------------------------------------
  // SHARED — vérification email
  // ----------------------------------------------------------------
  async checkEmailAvailability(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      throw new ConflictException('Cet email est déjà utilisé');
    }
  }

  // ----------------------------------------------------------------
  // SHARED — génération des JWT access + refresh
  // ----------------------------------------------------------------
  async generateTokens(userId: number, email: string) {
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

  // ----------------------------------------------------------------
  // SHARED — sauvegarde du refresh token hashé en BDD
  // ----------------------------------------------------------------
  async saveRefreshToken(
    userId: number,
    token: string,
    userAgent: string,
    ip: string,
  ): Promise<void> {
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

  // ----------------------------------------------------------------
  // SHARED — génération + sauvegarde d'un token OTP (email / reset)
  // Durée de validité : 15 minutes.
  // ----------------------------------------------------------------
  async generateAndSaveToken(userId: number, type: TokenType): Promise<string> {
    try {
      // 1. Nettoyage : On supprime les anciens tokens de ce type pour cet user
      // Cela garantit qu'il n'y a toujours qu'un seul token valide par type.
      await this.prisma.token.deleteMany({
        where: { userId, type },
      });

      // 2. Génération du code à 6 chiffres en mode test on force le code à "123456" pour faciliter les tests automatisés
      let code: string;
      if (process.env.USE_DETERMINISTIC_OTP === 'true') {
        // On génère un code unique basé sur l'ID utilisateur (ex: ID 42 -> 000042)
        // Cela garantit que le hash en BDD sera UNIQUE pour chaque utilisateur
        code = userId.toString().padStart(6, '0');
      } else {
        code = randomInt(100000, 999999).toString();
      }

      // 3. Hashage pour la BDD
      const hashedToken = crypto
        .createHash('sha256')
        .update(code)
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

      // On retourne le code brut pour pouvoir l'envoyer par email
      return code;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la génération du token ${type} pour userId ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // SHARED — mapping Prisma User → User DTO partagé
  // ----------------------------------------------------------------
  mapUserToResponse(user: UserWithRelations): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPassword: !!user.password,
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
      associations:
        user.associations?.map((assocUser) => ({
          associationId: assocUser.associationId,
          name: assocUser.association.name,
          role: assocUser.role as unknown as SharedAssociationRole,
        })) ?? [],

      // Nouveaux champs
      skills:
        user.skills?.map((userSkill) => ({
          id: userSkill.skill.id,
          label: userSkill.skill.label,
        })) ?? [],

      causes:
        user.causes?.map((userCause) => ({
          id: userCause.cause.id,
          label: userCause.cause.label,
        })) ?? [],

      availability: user.availability
        ? {
            frequency: user.availability.frequency,
            timeSlot: user.availability.timeSlot,
            type: user.availability.type,
          }
        : null,

      participations:
        user.participations?.map((p) => ({
          missionId: p.missionId,
          createdAt: p.createdAt.toISOString(),
          mission: {
            id: p.mission.id,
            title: p.mission.title,
            type: p.mission.type,
            startDate: p.mission.startDate?.toISOString() ?? null,
            association: {
              id: p.mission.association.id,
              name: p.mission.association.name,
            },
          },
        })) ?? [],
    };
  }
}
