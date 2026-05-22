import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  UserStatus,
  UserAvailability,
  AvailabilityTime,
  MissionStatus,
} from '../generated/prisma/client';
import {
  User,
  UpdateProfileDto,
  DeleteAccountDto,
  UpdateNotificationsDto,
  RegisterPushTokenDto,
  FollowedAssociationItem,
  ParticipationStatsDto,
  ParticipationStatsQueryDto,
  ActivityType,
} from '@repo/shared';
import { Response } from 'express';
import { verify } from 'argon2';
import { AuthService } from '../auth/auth.service';
import { CookieService } from '../auth/shared/cookie.service';
import {
  IFileService,
  FILE_SERVICE,
} from '../common/files/interfaces/file-service.interface';
import { ConversationService } from '../messaging/conversation.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ProfileService {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Récupère le profil complet de l'utilisateur connecté.
   *
   * Inclut les relations : adresse, associations, compétences, causes,
   * disponibilités et les 5 dernières participations aux missions.
   *
   * @param userId - Identifiant de l'utilisateur connecté
   * @returns Le profil complet mappé en DTO partagé
   * @throws UnauthorizedException si l'utilisateur est introuvable
   * @throws BadRequestException si le compte est suspendu ou supprimé
   */
  async getProfile(userId: number): Promise<User> {
    const { prisma } = this.authService;

    const [user, participationCounts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          address: true,
          associations: { include: { association: true } },
          skills: { include: { skill: true } },
          causes: { include: { cause: true } },
          availability: true,
          participations: {
            where: { mission: { status: { not: MissionStatus.DELETED } } },
            include: {
              mission: {
                include: {
                  association: true,
                  causes: { include: { cause: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: { select: { follows: true } },
        },
      }),
      this.computeParticipationCounts(userId),
    ]);

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new BadRequestException('Votre compte a été supprimé ou suspendu.');
    }

    return {
      ...this.authService.mapUserToResponse(user),
      participationsCount: participationCounts.participationsCount,
      helpedAssociationsCount: participationCounts.helpedAssociationsCount,
    };
  }

  /**
   * Compte le total de participations et d'associations distinctes pour un
   * utilisateur. Calculé séparément du `getProfile` car le `participations`
   * principal est limité à 5 entrées (aperçu historique) — utiliser
   * `participations.length` côté front sous-estime les vrais totaux.
   */
  private async computeParticipationCounts(
    userId: number,
  ): Promise<{ participationsCount: number; helpedAssociationsCount: number }> {
    const { prisma } = this.authService;
    const rows = await prisma.missionParticipant.findMany({
      where: {
        userId,
        mission: { status: { not: MissionStatus.DELETED } },
      },
      select: { mission: { select: { associationId: true } } },
    });

    return {
      participationsCount: rows.length,
      helpedAssociationsCount: new Set(rows.map((r) => r.mission.associationId))
        .size,
    };
  }

  /**
   * Met à jour le profil de l'utilisateur connecté.
   *
   * Gère en une seule opération :
   * - Les infos de base (nom, prénom, âge, biographie)
   * - La photo de profil (upload vers le storage avec rollback en cas d'erreur)
   * - L'adresse (upsert — crée ou met à jour)
   * - Les compétences (remplacement complet de la liste)
   * - Les causes (remplacement complet de la liste)
   * - Les disponibilités (upsert — crée ou met à jour)
   *
   * Seuls les champs présents dans le DTO sont mis à jour.
   *
   * @param userId - Identifiant de l'utilisateur connecté
   * @param dto - Données partielles à mettre à jour
   * @param file - Nouvelle photo de profil (optionnel)
   * @returns Le profil mis à jour mappé en DTO partagé
   * @throws UnauthorizedException si l'utilisateur est introuvable
   * @throws BadRequestException si le compte est suspendu ou supprimé
   */
  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    const { prisma, logger } = this.authService;

    // 1. Vérifier que l'utilisateur existe et est actif
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (
      existingUser.status === UserStatus.DELETED ||
      existingUser.status === UserStatus.SUSPENDED
    ) {
      throw new BadRequestException('Votre compte a été supprimé ou suspendu.');
    }

    // 2. Gestion de la photo de profil
    let profilePictureUrl: string | undefined;
    let shouldRemovePicture = false;

    if (file) {
      const uploadResult = await this.fileService.uploadFile(file, 'avatars');
      profilePictureUrl = uploadResult.publicId;
    } else if (dto.removeProfilePicture && existingUser.profilePicture) {
      shouldRemovePicture = true;
      await this.fileService
        .deleteFile(existingUser.profilePicture)
        .catch((e) => logger.warn('Erreur suppression photo profil', e));
    }

    let profilePictureData = {};
    if (profilePictureUrl) {
      profilePictureData = { profilePicture: profilePictureUrl };
    } else if (shouldRemovePicture) {
      profilePictureData = { profilePicture: null };
    }

    try {
      // 3. Mise à jour des infos de base
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          age: dto.age,
          ...(dto.biography !== undefined && { biography: dto.biography }),
          ...profilePictureData,

          // 4. Adresse obligatoire - toujours upsert
          address: {
            upsert: {
              create: {
                street: dto.address.street,
                postalCode: dto.address.postalCode,
                city: dto.address.city,
                latitude: dto.address.latitude,
                longitude: dto.address.longitude,
              },
              update: {
                street: dto.address.street,
                postalCode: dto.address.postalCode,
                city: dto.address.city,
                latitude: dto.address.latitude,
                longitude: dto.address.longitude,
              },
            },
          },
        },
      });

      // 5. Mise à jour des compétences (remplace toute la liste)
      if (dto.skillIds !== undefined) {
        await prisma.userSkill.deleteMany({ where: { userId } });

        if (dto.skillIds.length > 0) {
          await prisma.userSkill.createMany({
            data: dto.skillIds.map((skillId) => ({ userId, skillId })),
          });
        }
      }

      // 6. Mise à jour des causes (remplace toute la liste)
      if (dto.causeIds !== undefined) {
        await prisma.userCause.deleteMany({ where: { userId } });

        if (dto.causeIds.length > 0) {
          await prisma.userCause.createMany({
            data: dto.causeIds.map((causeId) => ({ userId, causeId })),
          });
        }
      }

      // 7. Mise à jour des disponibilités (upsert)
      if (dto.availability) {
        // Si tous les créneaux sont sélectionnés → stocker ALL_TIME
        const allTimeSlots = Object.values(AvailabilityTime).filter(
          (t) => t !== AvailabilityTime.ALL_TIME,
        );
        const selectedTimeSlots = dto.availability.timeSlots ?? [];
        const isAllTime =
          allTimeSlots.every((slot) => selectedTimeSlots.includes(slot)) ||
          selectedTimeSlots.includes(AvailabilityTime.ALL_TIME);

        const timeSlots = isAllTime
          ? [AvailabilityTime.ALL_TIME]
          : selectedTimeSlots;

        await prisma.userAvailability.upsert({
          where: { userId },
          create: {
            userId,
            frequency: dto.availability.frequency as any,
            timeSlot: timeSlots as any,
            type: dto.availability.type as UserAvailability['type'],
          },
          update: {
            frequency: dto.availability.frequency as any,
            timeSlot: timeSlots as any,
            type: dto.availability.type as UserAvailability['type'],
          },
        });
      }
    } catch (error) {
      // Rollback image si erreur après upload
      if (profilePictureUrl) {
        this.fileService
          .deleteFile(profilePictureUrl)
          .catch((e) => logger.error('Erreur rollback image profil', e));
      }
      throw error;
    }

    // 8. Retourner le profil mis à jour
    return this.getProfile(userId);
  }

  /**
   * Met à jour les préférences de notifications de l'utilisateur connecté.
   *
   * @param userId - Identifiant de l'utilisateur connecté
   * @param dto - Nouvelles préférences (emailNotifications, pushNotifications)
   * @returns Le profil mis à jour mappé en DTO partagé
   */
  async updateNotifications(
    userId: number,
    dto: UpdateNotificationsDto,
  ): Promise<User> {
    const { prisma } = this.authService;

    // Vérification que l'utilisateur existe et est actif
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new BadRequestException('Votre compte a été supprimé ou suspendu.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.emailNotifications !== undefined && {
          emailNotifications: dto.emailNotifications,
        }),
        ...(dto.matchNotifications !== undefined && {
          matchNotifications: dto.matchNotifications,
        }),
      },
    });

    return this.getProfile(userId);
  }

  async savePushToken(
    userId: number,
    dto: RegisterPushTokenDto,
  ): Promise<void> {
    const { prisma } = this.authService;
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: dto.pushToken },
    });
  }

  async getFollowedAssociations(
    userId: number,
  ): Promise<FollowedAssociationItem[]> {
    const { prisma } = this.authService;

    const follows = await prisma.userAssociationFollow.findMany({
      where: { userId },
      select: {
        association: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            address: { select: { city: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return follows.map((f) => ({
      id: f.association.id,
      name: f.association.name,
      logoUrl: f.association.logoUrl,
      city: f.association.address?.city ?? null,
    }));
  }

  async getParticipationStats(
    userId: number,
    query: ParticipationStatsQueryDto,
  ): Promise<ParticipationStatsDto> {
    const { prisma } = this.authService;

    const missionFilter: Record<string, unknown> = {
      status: { not: MissionStatus.DELETED },
    };
    if (query.startDate) {
      missionFilter['startDate'] = { gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      missionFilter['startDate'] = {
        ...(missionFilter['startDate'] as object),
        lte: new Date(query.endDate),
      };
    }
    if (query.type) {
      missionFilter['type'] = query.type;
    }

    const rows = await prisma.missionParticipant.findMany({
      where: {
        userId,
        mission: missionFilter,
      },
      include: {
        mission: {
          include: {
            association: true,
            causes: { include: { cause: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─── Summary ───────────────────────────────────────────────────────
    const totalParticipations = rows.length;
    const distinctAssociations = new Set(
      rows.map((r) => r.mission.associationId),
    ).size;

    const rowsWithDuration = rows.filter((r) => r.mission.durationInt != null);
    const totalHours =
      rowsWithDuration.length > 0
        ? Math.round(
            (rowsWithDuration.reduce((s, r) => s + r.mission.durationInt, 0) /
              60) *
              10,
          ) / 10
        : null;

    const typeCounts = new Map<string, number>();
    for (const r of rows) {
      typeCounts.set(r.mission.type, (typeCounts.get(r.mission.type) ?? 0) + 1);
    }
    let mostFrequentType: string | null = null;
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentType = type;
      }
    }

    // ─── By type ───────────────────────────────────────────────────────
    const byType = Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type: type as ActivityType,
        label: PARTICIPATION_TYPE_LABELS[type] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // ─── By month ──────────────────────────────────────────────────────
    const monthCounts = new Map<string, number>();
    for (const r of rows) {
      const date = r.mission.startDate ?? r.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
    const byMonth = Array.from(monthCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        label: formatParticipationMonthLabel(month),
        count,
      }));

    // ─── By association ────────────────────────────────────────────────
    const assocMap = new Map<number, { name: string; count: number }>();
    for (const r of rows) {
      const { associationId } = r.mission;
      const name = r.mission.association.name;
      const entry = assocMap.get(associationId);
      if (entry) {
        entry.count += 1;
      } else {
        assocMap.set(associationId, { name, count: 1 });
      }
    }
    const byAssociation = Array.from(assocMap.entries())
      .map(([associationId, { name, count }]) => ({
        associationId,
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // ─── Participations list ───────────────────────────────────────────
    const participations = rows.map((r) => ({
      missionId: r.missionId,
      createdAt: r.createdAt.toISOString(),
      mission: {
        id: r.mission.id,
        title: r.mission.title,
        type: r.mission.type,
        availabilityType: r.mission.availabilityType,
        startDate: r.mission.startDate?.toISOString() ?? null,
        endDate: r.mission.endDate?.toISOString() ?? null,
        durationInt: r.mission.durationInt,
        frequency: r.mission.frequency ?? null,
        causes: r.mission.causes.map((mc) => ({
          id: mc.cause.id,
          label: mc.cause.label,
        })),
        association: {
          id: r.mission.association.id,
          name: r.mission.association.name,
        },
      },
    }));

    return {
      participations,
      summary: {
        totalParticipations,
        distinctAssociations,
        totalHours,
        mostFrequentType: mostFrequentType as ActivityType | null,
      },
      byType,
      byMonth,
      byAssociation,
    };
  }

  async checkParticipation(
    userId: number,
    missionId: number,
  ): Promise<boolean> {
    const { prisma } = this.authService;
    const record = await prisma.missionParticipant.findFirst({
      where: { userId, missionId },
      select: { missionId: true },
    });
    return record !== null;
  }

  async participateInMission(userId: number, missionId: number): Promise<void> {
    const { prisma } = this.authService;
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true, status: true, hasRegistration: true },
    });
    if (mission?.status !== 'ACTIVE' || !mission?.hasRegistration) {
      throw new BadRequestException(
        "La mission n'accepte pas de candidatures.",
      );
    }
    await prisma.missionParticipant.upsert({
      where: { missionId_userId: { missionId, userId } },
      create: { userId, missionId },
      update: {},
    });
  }

  async cancelParticipation(userId: number, missionId: number): Promise<void> {
    const { prisma } = this.authService;
    await prisma.missionParticipant.deleteMany({
      where: { userId, missionId },
    });
  }

  /**
   * Supprime définitivement le compte de l'utilisateur connecté (hard delete).
   *
   * La confirmation diffère selon le type de compte :
   * - **Compte email/password** : vérification du mot de passe actuel
   * - **Compte Google** : saisie du texte exact "SUPPRIMER"
   *
   * Actions effectuées dans l'ordre :
   * 1. Vérification de l'existence et du statut du compte
   * 2. Vérification de la confirmation (mot de passe ou texte)
   * 3. Suppression de la photo de profil du storage (non bloquant)
   * 4. Invalidation des cookies de session
   * 5. Suppression en base (les relations en cascade sont gérées par Prisma)
   *
   * @param userId - Identifiant de l'utilisateur connecté
   * @param dto - DTO de confirmation (password ou confirmation texte)
   * @param res - Réponse Express pour invalider les cookies
   * @throws UnauthorizedException si l'utilisateur est introuvable
   * @throws BadRequestException si la confirmation est incorrecte ou le compte suspendu
   */
  async deleteProfile(
    userId: number,
    dto: DeleteAccountDto,
    res: Response,
  ): Promise<void> {
    const { prisma, logger } = this.authService;

    // 1. Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new BadRequestException('Votre compte a été supprimé ou suspendu.');
    }

    // 2. Vérification selon le type de compte

    if (!user.password && dto.confirmation !== 'SUPPRIMER') {
      throw new BadRequestException(
        'Veuillez saisir exactement "SUPPRIMER" pour confirmer',
      );
    }

    if (user.password) {
      // Compte email/password — vérification du mot de passe
      if (!dto.password) {
        throw new BadRequestException(
          'Le mot de passe est requis pour supprimer votre compte',
        );
      }

      const isMatch = await verify(user.password, dto.password);
      if (!isMatch) {
        throw new BadRequestException('Mot de passe incorrect');
      }
    }

    // 3. Supprimer la photo de profil du storage si elle existe
    if (user.profilePicture) {
      await this.fileService
        .deleteFile(user.profilePicture)
        .catch((e) => logger.error('Erreur suppression photo profil', e));
    }

    // 4. Notifier WS les autres participants des conversations qui vont
    //    être supprimées en cascade par Prisma (et resync leur compteur).
    //    skipDelete=true : on laisse la cascade Prisma faire la suppression.
    await this.conversationService.deleteConversationsAndNotify({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      reason: 'user_deleted',
      excludedUserId: userId,
      skipDelete: true,
    });

    // 5. Invalider les cookies de session
    this.cookieService.clearAuthCookies(res);

    // 6. Hard delete — les relations en cascade sont gérées par Prisma
    await prisma.user.delete({ where: { id: userId } });
  }

  /**
   * Génère un export Excel (.xlsx) de toutes les données personnelles de l'utilisateur (RGPD).
   *
   * Produit un classeur avec une feuille par thème : informations personnelles,
   * adresse, notifications, compétences, causes, disponibilités, associations
   * et l'intégralité de l'historique de missions.
   *
   * @param userId - Identifiant de l'utilisateur connecté
   * @returns Buffer du fichier .xlsx
   * @throws UnauthorizedException si l'utilisateur est introuvable
   */
  async exportData(userId: number): Promise<Buffer> {
    const { prisma } = this.authService;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        associations: { include: { association: true } },
        skills: { include: { skill: true } },
        causes: { include: { cause: true } },
        availability: true,
        participations: {
          where: { mission: { status: { not: MissionStatus.DELETED } } },
          include: { mission: { include: { association: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'GiveAWay';
    workbook.created = new Date();

    // Helpers de style --------------------------------------------------------

    const HEADER_FILL: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // indigo-600
    };

    const applyHeader = (row: ExcelJS.Row) => {
      row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      row.fill = HEADER_FILL;
      row.alignment = { vertical: 'middle' };
      row.height = 20;
    };

    const autoWidth = (sheet: ExcelJS.Worksheet) => {
      sheet.columns.forEach((col) => {
        let max = 10;
        col.eachCell?.({ includeEmpty: false }, (cell) => {
          let len = 0;
          if (typeof cell.value === 'string') {
            len = cell.value.length;
          } else if (
            typeof cell.value === 'number' ||
            typeof cell.value === 'boolean'
          ) {
            len = String(cell.value).length;
          } else if (cell.value instanceof Date) {
            len = cell.value.toLocaleDateString('fr-FR').length;
          }
          if (len > max) max = len;
        });
        col.width = Math.min(max + 4, 60);
      });
    };

    const addKVSheet = (
      name: string,
      rows: [string, string | number | null | undefined][],
    ) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = [
        { header: 'Champ', key: 'label', width: 28 },
        { header: 'Valeur', key: 'value', width: 40 },
      ];
      applyHeader(sheet.getRow(1));
      rows.forEach(([label, value]) =>
        sheet.addRow({ label, value: value ?? 'Non renseigné' }),
      );
      autoWidth(sheet);
    };

    // =========================================================================
    // FEUILLE 1 — Informations personnelles
    // =========================================================================
    addKVSheet('Informations personnelles', [
      ['Prénom', user.firstName],
      ['Nom', user.lastName],
      ['E-mail', user.email],
      ['Âge', user.age],
      ['Biographie', user.biography],
      ['Connexion Google', user.googleId ? 'Oui' : 'Non'],
      ['Mot de passe défini', user.password ? 'Oui' : 'Non'],
      ['Statut du compte', String(user.status)],
      [
        'E-mail vérifié le',
        user.emailVerifiedAt?.toLocaleDateString('fr-FR') ?? null,
      ],
      ['CGU acceptées le', user.termsAcceptedAt.toLocaleDateString('fr-FR')],
      ['Membre depuis', user.createdAt.toLocaleDateString('fr-FR')],
      ["Date d'export", new Date().toLocaleString('fr-FR')],
    ]);

    // =========================================================================
    // FEUILLE 2 — Adresse
    // =========================================================================
    addKVSheet(
      'Adresse',
      user.address
        ? [
            ['Rue', user.address.street],
            ['Code postal', user.address.postalCode],
            ['Ville', user.address.city],
            [
              'Latitude',
              user.address.latitude != null
                ? String(user.address.latitude)
                : null,
            ],
            [
              'Longitude',
              user.address.longitude != null
                ? String(user.address.longitude)
                : null,
            ],
          ]
        : [['', 'Aucune adresse renseignée']],
    );

    // =========================================================================
    // FEUILLE 3 — Notifications
    // =========================================================================
    addKVSheet('Notifications', [
      [
        'Notifications e-mail',
        user.emailNotifications ? 'Activées' : 'Désactivées',
      ],
    ]);

    // =========================================================================
    // FEUILLE 4 — Compétences
    // =========================================================================
    {
      const sheet = workbook.addWorksheet('Compétences');
      sheet.columns = [{ header: 'Compétence', key: 'label', width: 32 }];
      applyHeader(sheet.getRow(1));
      if (user.skills.length) {
        user.skills.forEach((s) => sheet.addRow({ label: s.skill.label }));
      } else {
        sheet.addRow({ label: 'Aucune compétence renseignée' });
      }
      autoWidth(sheet);
    }

    // =========================================================================
    // FEUILLE 5 — Causes soutenues
    // =========================================================================
    {
      const sheet = workbook.addWorksheet('Causes soutenues');
      sheet.columns = [{ header: 'Cause', key: 'label', width: 32 }];
      applyHeader(sheet.getRow(1));
      if (user.causes.length) {
        user.causes.forEach((c) => sheet.addRow({ label: c.cause.label }));
      } else {
        sheet.addRow({ label: 'Aucune cause renseignée' });
      }
      autoWidth(sheet);
    }

    // =========================================================================
    // FEUILLE 6 — Disponibilités
    // =========================================================================
    addKVSheet(
      'Disponibilités',
      user.availability
        ? [
            ['Fréquence', String(user.availability.frequency)],
            ['Créneaux', user.availability.timeSlot.map(String).join(' / ')],
            ['Type', String(user.availability.type)],
          ]
        : [['', 'Aucune disponibilité renseignée']],
    );

    // =========================================================================
    // FEUILLE 7 — Associations
    // =========================================================================
    {
      const sheet = workbook.addWorksheet('Associations');
      sheet.columns = [
        { header: 'Association', key: 'name', width: 32 },
        { header: 'Rôle', key: 'role', width: 16 },
      ];
      applyHeader(sheet.getRow(1));
      if (user.associations.length) {
        user.associations.forEach((a) =>
          sheet.addRow({ name: a.association.name, role: String(a.role) }),
        );
      } else {
        sheet.addRow({ name: 'Aucune association', role: '' });
      }
      autoWidth(sheet);
    }

    // =========================================================================
    // FEUILLE 8 — Historique de missions
    // =========================================================================
    {
      const sheet = workbook.addWorksheet('Historique de missions');
      sheet.columns = [
        { header: 'Mission', key: 'title', width: 36 },
        { header: 'Association', key: 'asso', width: 28 },
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Date de participation', key: 'date', width: 22 },
      ];
      applyHeader(sheet.getRow(1));
      if (user.participations.length) {
        user.participations.forEach((p) =>
          sheet.addRow({
            title: p.mission.title,
            asso: p.mission.association.name,
            type: String(p.mission.type),
            date: p.createdAt.toLocaleDateString('fr-FR'),
          }),
        );
      } else {
        sheet.addRow({
          title: 'Aucune participation',
          asso: '',
          type: '',
          date: '',
        });
      }
      autoWidth(sheet);
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}

// ─── Helpers module-level ─────────────────────────────────────────────────────

const PARTICIPATION_TYPE_LABELS: Record<string, string> = {
  MISSION: 'Mission',
  EVENT: 'Événement',
  COLLECT: 'Collecte',
  INFO: 'Information',
};

function formatParticipationMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(
    Number.parseInt(year, 10),
    Number.parseInt(monthNum, 10) - 1,
    1,
  );
  const label = date.toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
