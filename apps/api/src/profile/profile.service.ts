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
} from '../generated/prisma/client';
import {
  User,
  UpdateProfileDto,
  DeleteAccountDto,
  UpdateNotificationsDto,
  RegisterPushTokenDto,
} from '@repo/shared';
import { Response } from 'express';
import { verify } from 'argon2';
import { AuthService } from '../auth/auth.service';
import { CookieService } from '../auth/shared/cookie.service';
import {
  IFileService,
  FILE_SERVICE,
} from '../common/files/interfaces/file-service.interface';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ProfileService {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        associations: { include: { association: true } },
        skills: { include: { skill: true } },
        causes: { include: { cause: true } },
        availability: true,
        participations: {
          include: {
            mission: {
              include: { association: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
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

    return this.authService.mapUserToResponse(user);
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

    // Vérification défensive des types (double sécurité après ZodValidationPipe)
    if (typeof dto.emailNotifications !== 'boolean') {
      throw new BadRequestException(
        'Les préférences de notifications doivent être des booléens',
      );
    }

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
        emailNotifications: dto.emailNotifications,
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

    // 4. Invalider les cookies de session
    this.cookieService.clearAuthCookies(res);

    // 5. Hard delete — les relations en cascade sont gérées par Prisma
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
