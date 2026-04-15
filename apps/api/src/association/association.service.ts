import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AssociationDto,
  AssociationMemberDto,
  AssociationDocumentDto,
  AddMemberDto,
  UpdateAssociationDto,
  UpdateMemberRoleDto,
  TransferOwnerDto,
  AssociationRole,
  AssociationStatus,
  AssociationMapItem,
  NearbyQueryDto,
} from '@repo/shared';
import {
  AssociationRole as PrismaAssociationRole,
  AssociationStatus as PrismaAssociationStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FILE_SERVICE,
  IFileService,
} from '../common/files/interfaces/file-service.interface';

// Type Prisma avec relations pour le mapping
type AssociationWithRelations = Awaited<
  ReturnType<typeof PrismaService.prototype.association.findUnique>
> & {
  address?: {
    id: number;
    street: string;
    postalCode: string;
    city: string;
    latitude: unknown;
    longitude: unknown;
  } | null;
  members?: Array<{
    id: number;
    role: string;
    createdAt: Date;
    userId: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      profilePicture: string | null;
    };
  }>;
  documents?: Array<{
    id: number;
    fileUrl: string;
    type: string;
    createdAt: Date;
  }>;
};

@Injectable()
export class AssociationService {
  private readonly logger = new Logger(AssociationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
  ) {}

  // ----------------------------------------------------------------
  // GET — profil complet de l'association
  // ----------------------------------------------------------------
  async getAssociation(associationId: number): Promise<AssociationDto> {
    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      include: {
        address: true,
        members: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!association) {
      throw new NotFoundException('Association introuvable');
    }

    return this.mapToAssociationDto(association as AssociationWithRelations);
  }

  // ----------------------------------------------------------------
  // GET — liste des missions de l'association
  // ----------------------------------------------------------------
  async getAssociationMissions(
    associationId: number,
    page: number,
    pageSize: number,
  ) {
    const skip = (page - 1) * pageSize;

    const [rawMissions, total] = await this.prisma.$transaction([
      this.prisma.mission.findMany({
        where: { associationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          association: {
            select: { name: true },
          },
          address: true,
          causes: {
            include: { cause: true },
          },
          volunteerTypes: {
            include: { volunteerType: true },
          },
        },
      }),
      this.prisma.mission.count({
        where: { associationId },
      }),
    ]);

    const missions = rawMissions.map((mission) => ({
      ...mission,
      causes: mission.causes.map((mc) => mc.cause),
      volunteerTypes: mission.volunteerTypes.map((mvt) => mvt.volunteerType),
    }));

    return {
      missions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ----------------------------------------------------------------
  // PATCH — mise à jour des informations de l'association
  // ----------------------------------------------------------------
  async updateAssociation(
    associationId: number,
    dto: UpdateAssociationDto,
    logoFile?: Express.Multer.File,
    documentFiles?: Express.Multer.File[],
  ): Promise<AssociationDto> {
    const existing = await this.prisma.association.findUnique({
      where: { id: associationId },
      include: { address: true, documents: true },
    });

    if (!existing) {
      throw new NotFoundException('Association introuvable');
    }

    // ── 1. Gestion du logo ─────────────────────────────────────────
    // undefined = pas de changement ; null = effacer en base
    let newLogoPublicId: string | null | undefined;

    if (logoFile) {
      // Nouveau fichier : upload puis suppression de l'ancien (best effort)
      const uploadResult = await this.fileService.uploadFile(
        logoFile,
        'association-logos',
      );
      newLogoPublicId = uploadResult.publicId;

      if (existing.logoUrl) {
        this.fileService
          .deleteFile(existing.logoUrl)
          .catch((e) =>
            this.logger.warn(
              `Impossible de supprimer l'ancien logo (${existing.logoUrl})`,
              e,
            ),
          );
      }
    } else if (dto.logoUrl !== undefined && dto.logoUrl === '') {
      // Signal de suppression explicite (logoUrl = "" sans nouveau fichier)
      if (existing.logoUrl) {
        this.fileService
          .deleteFile(existing.logoUrl)
          .catch((e) =>
            this.logger.warn(
              `Impossible de supprimer le logo (${existing.logoUrl})`,
              e,
            ),
          );
      }
      newLogoPublicId = null;
    }

    // ── 2. Suppression des documents retirés ──────────────────────
    if (dto.documentUrls !== undefined) {
      const urlsToKeep = new Set(dto.documentUrls);
      const docsToDelete = (existing.documents ?? []).filter(
        (d) => !urlsToKeep.has(d.fileUrl),
      );

      if (docsToDelete.length > 0) {
        await Promise.allSettled(
          docsToDelete.map((doc) =>
            this.fileService
              .deleteFile(doc.fileUrl)
              .catch((e) =>
                this.logger.warn(
                  `Impossible de supprimer le document (${doc.fileUrl})`,
                  e,
                ),
              ),
          ),
        );

        await this.prisma.associationDocument.deleteMany({
          where: { id: { in: docsToDelete.map((d) => d.id) } },
        });
      }
    }

    // ── 3. Upload des nouveaux documents ──────────────────────────
    if (documentFiles && documentFiles.length > 0) {
      for (const doc of documentFiles) {
        try {
          const result = await this.fileService.uploadFile(
            doc,
            'association-documents',
          );
          await this.prisma.associationDocument.create({
            data: {
              associationId,
              fileUrl: result.publicId,
              type: doc.mimetype.startsWith('image/') ? 'IMAGE' : 'PDF',
            },
          });
        } catch (e) {
          this.logger.warn(
            `Impossible d'uploader le document (${doc.originalname})`,
            e,
          );
        }
      }
    }

    // ── 4. Construction des données scalaires ──────────────────────
    const scalarData: Record<string, unknown> = {};

    if (dto.name !== undefined) scalarData.name = dto.name;
    if (dto.object !== undefined) scalarData.object = dto.object;
    if (dto.legalStatus !== undefined) scalarData.legalStatus = dto.legalStatus;
    if (dto.phone !== undefined) scalarData.phone = dto.phone || null;
    if (dto.website !== undefined) scalarData.website = dto.website || null;
    if (dto.description !== undefined) scalarData.description = dto.description;

    if (newLogoPublicId !== undefined) {
      scalarData.logoUrl = newLogoPublicId; // null efface, string remplace
    }

    // ── 5. Mise à jour Prisma ──────────────────────────────────────
    await this.prisma.association.update({
      where: { id: associationId },
      data: {
        ...scalarData,
        ...this.buildAddressUpsert(dto),
      },
    });

    return this.getAssociation(associationId);
  }

  // ----------------------------------------------------------------
  // GET — téléchargement sécurisé d'un document (OWNER uniquement)
  // ----------------------------------------------------------------
  async getDocumentForDownload(associationId: number, documentId: number) {
    const doc = await this.prisma.associationDocument.findFirst({
      where: { id: documentId, associationId },
    });

    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    return this.fileService.getFileForDownload(doc.fileUrl);
  }

  // ----------------------------------------------------------------
  // GET — liste des membres
  // ----------------------------------------------------------------
  async getMembers(associationId: number): Promise<AssociationMemberDto[]> {
    const members = await this.prisma.associationUser.findMany({
      where: { associationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => this.mapToMemberDto(m));
  }

  // ----------------------------------------------------------------
  // POST — ajout d'un membre par email
  // ----------------------------------------------------------------
  async addMember(
    associationId: number,
    dto: AddMemberDto,
  ): Promise<AssociationMemberDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `Aucun utilisateur trouvé avec l'email ${dto.email}`,
      );
    }

    const existing = await this.prisma.associationUser.findFirst({
      where: { associationId, userId: user.id },
    });

    if (existing) {
      throw new ConflictException(
        "Cet utilisateur est déjà membre de l'association",
      );
    }

    const member = await this.prisma.associationUser.create({
      data: {
        associationId,
        userId: user.id,
        role: PrismaAssociationRole.EDITOR,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return this.mapToMemberDto(member);
  }

  // ----------------------------------------------------------------
  // PATCH — mise à jour du rôle d'un membre
  // ----------------------------------------------------------------
  async updateMemberRole(
    associationId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ): Promise<AssociationMemberDto> {
    const member = await this.prisma.associationUser.findFirst({
      where: { id: memberId, associationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }

    // Impossible de changer le rôle de l'OWNER via cette route
    if (member.role === PrismaAssociationRole.OWNER) {
      throw new ForbiddenException(
        "Impossible de modifier le rôle de l'OWNER via cette route. Utilisez /transfer-owner.",
      );
    }

    const updated = await this.prisma.associationUser.update({
      where: { id: memberId },
      data: { role: dto.role as PrismaAssociationRole },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return this.mapToMemberDto(updated);
  }

  // ----------------------------------------------------------------
  // DELETE — retrait d'un membre
  // ----------------------------------------------------------------
  async removeMember(
    associationId: number,
    memberId: number,
    requestingUserId: number,
  ): Promise<void> {
    const member = await this.prisma.associationUser.findFirst({
      where: { id: memberId, associationId },
    });

    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }

    // Impossible de retirer l'OWNER
    if (member.role === PrismaAssociationRole.OWNER) {
      throw new ForbiddenException(
        "Impossible de retirer l'OWNER de l'association. Utilisez /transfer-owner d'abord.",
      );
    }

    // Un ADMIN ne peut pas retirer un autre ADMIN
    const requestingMember = await this.prisma.associationUser.findFirst({
      where: { associationId, userId: requestingUserId },
    });

    if (
      requestingMember?.role === PrismaAssociationRole.ADMIN &&
      member.role === PrismaAssociationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Un ADMIN ne peut pas retirer un autre ADMIN',
      );
    }

    await this.prisma.associationUser.delete({ where: { id: memberId } });
  }

  // ----------------------------------------------------------------
  // POST — transfert de propriété
  // ----------------------------------------------------------------
  async transferOwner(
    associationId: number,
    dto: TransferOwnerDto,
    requestingUserId: number,
  ): Promise<void> {
    if (dto.newOwnerUserId === requestingUserId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous transférer la propriété à vous-même',
      );
    }

    const targetMember = await this.prisma.associationUser.findFirst({
      where: { associationId, userId: dto.newOwnerUserId },
    });

    if (!targetMember) {
      throw new NotFoundException(
        "L'utilisateur cible n'est pas membre de cette association",
      );
    }

    const currentOwnerMember = await this.prisma.associationUser.findFirst({
      where: { associationId, userId: requestingUserId },
    });

    if (!currentOwnerMember) {
      throw new NotFoundException('Membre demandeur introuvable');
    }

    // Transaction atomique : nouveau OWNER + ancien OWNER → ADMIN
    await this.prisma.$transaction([
      this.prisma.associationUser.update({
        where: { id: targetMember.id },
        data: { role: PrismaAssociationRole.OWNER },
      }),
      this.prisma.associationUser.update({
        where: { id: currentOwnerMember.id },
        data: { role: PrismaAssociationRole.ADMIN },
      }),
    ]);
  }

  /**
   * Retourne les associations validées situées dans un rayon donné
   * autour d'un point géographique, en utilisant la formule de Haversine.
   * Supporte un filtre optionnel par catégorie et par date de création.
   *
   * @param query - Paramètres validés par NearbyQuerySchema
   */
  async findNearby(query: NearbyQueryDto): Promise<AssociationMapItem[]> {
    const {
      lat,
      lng,
      radius,
      limit,
      categoryIds,
      createdAfter,
      createdBefore,
    } = query;

    const categoryFilter =
      categoryIds && categoryIds.length > 0
        ? Prisma.sql`AND a.category_id = ANY(ARRAY[${Prisma.join(categoryIds)}]::int[])`
        : Prisma.empty;

    const createdAfterFilter = createdAfter
      ? Prisma.sql`AND a.created_at >= ${createdAfter}`
      : Prisma.empty;

    const createdBeforeFilter = createdBefore
      ? Prisma.sql`AND a.created_at <= ${createdBefore}`
      : Prisma.empty;

    return this.prisma.$queryRaw<AssociationMapItem[]>`
      SELECT
        sub.id,
        sub.name,
        sub."logoUrl",
        sub.city,
        sub.latitude,
        sub.longitude,
        sub.description,
        sub.website,
        sub.category
      FROM (
        SELECT
          a.id,
          a.name,
          a.logo_url                    AS "logoUrl",
          addr.city,
          addr.latitude::float          AS latitude,
          addr.longitude::float         AS longitude,
          a.description,
          a.website,
          ac.name                       AS category,
          (
            6371 * acos(
              LEAST(1.0,
                cos(radians(${lat}::float)) * cos(radians(addr.latitude::float))
                * cos(radians(addr.longitude::float) - radians(${lng}::float))
                + sin(radians(${lat}::float)) * sin(radians(addr.latitude::float))
              )
            )
          )                             AS distance
        FROM associations a
        JOIN addresses addr ON a.address_id = addr.id
        LEFT JOIN association_categories ac ON a.category_id = ac.id
        WHERE a.status = 'VALIDATED'
          AND addr.latitude  IS NOT NULL
          AND addr.longitude IS NOT NULL
          ${categoryFilter}
          ${createdAfterFilter}
          ${createdBeforeFilter}
      ) sub
      WHERE sub.distance <= ${radius}
      ORDER BY sub.distance
      LIMIT ${limit}
    `;
  }

  // ----------------------------------------------------------------
  // Helpers privés
  // ----------------------------------------------------------------

  /**
   * Construit l'upsert Prisma pour l'adresse du siège.
   * Retourne un objet vide si aucune adresse n'est fournie dans le DTO.
   */
  private buildAddressUpsert(
    dto: UpdateAssociationDto,
  ): Record<string, unknown> {
    if (!dto.address) return {};

    const addressData = {
      street: dto.address.street,
      postalCode: dto.address.postalCode,
      city: dto.address.city,
      latitude: dto.address.latitude ?? null,
      longitude: dto.address.longitude ?? null,
    };

    return {
      address: {
        upsert: {
          create: addressData,
          update: addressData,
        },
      },
    };
  }

  private mapToAssociationDto(
    association: NonNullable<AssociationWithRelations>,
  ): AssociationDto {
    return {
      id: association.id,
      name: association.name,
      rna: association.rna ?? null,
      siret: association.siret ?? null,
      object: association.object ?? null,
      legalStatus: association.legalStatus ?? null,
      phone: association.phone ?? null,
      website: association.website ?? null,
      description: association.description ?? null,
      logoUrl: association.logoUrl ?? null,
      status: association.status as unknown as AssociationStatus,
      requiresManualReview: association.requiresManualReview,
      rejectionReason:
        (association as { rejectionReason?: string | null }).rejectionReason ??
        null,
      createdAt: association.createdAt.toISOString(),
      updatedAt: association.updatedAt.toISOString(),
      address: association.address
        ? {
            id: association.address.id,
            street: association.address.street,
            postalCode: association.address.postalCode,
            city: association.address.city,
            latitude: association.address.latitude
              ? Number(association.address.latitude)
              : null,
            longitude: association.address.longitude
              ? Number(association.address.longitude)
              : null,
          }
        : null,
      members: (association.members ?? []).map((m) => this.mapToMemberDto(m)),
      documents: (association.documents ?? []).map(
        (d): AssociationDocumentDto => ({
          id: d.id,
          fileUrl: d.fileUrl,
          type: d.type,
          createdAt: d.createdAt.toISOString(),
        }),
      ),
    };
  }

  private mapToMemberDto(member: {
    id: number;
    role: string;
    createdAt: Date;
    userId: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      profilePicture: string | null;
    };
  }): AssociationMemberDto {
    return {
      id: member.id,
      userId: member.userId,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      profilePicture: member.user.profilePicture,
      role: member.role as AssociationRole,
      createdAt: member.createdAt.toISOString(),
    };
  }
}
