import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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
import { AssociationVerificationService } from '../auth/register/association-verification.service';
import type { RegisterAssociationDto } from '@repo/shared';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly associationVerificationService: AssociationVerificationService,
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
  // PATCH — mise à jour des informations de l'association
  // ----------------------------------------------------------------
  async updateAssociation(
    associationId: number,
    dto: UpdateAssociationDto,
  ): Promise<AssociationDto> {
    const existing = await this.prisma.association.findUnique({
      where: { id: associationId },
      include: { address: true },
    });

    if (!existing) {
      throw new NotFoundException('Association introuvable');
    }

    // Vérifie si RNA ou SIRET change → re-vérification API
    const rnaChanging =
      dto.rna !== undefined && dto.rna !== (existing.rna ?? '');
    const siretChanging =
      dto.siret !== undefined && dto.siret !== (existing.siret ?? '');

    if (rnaChanging || siretChanging) {
      // Pour la vérification de cohérence, on privilégie l'adresse du DTO
      // (si fournie) sur celle existante en base.
      const addressForVerification = dto.address
        ? {
            street: dto.address.street,
            postalCode: dto.address.postalCode,
            city: dto.address.city,
          }
        : existing.address
          ? {
              street: existing.address.street,
              postalCode: existing.address.postalCode,
              city: existing.address.city,
            }
          : undefined;

      const verificationInput = {
        name: dto.name ?? existing.name,
        rna:
          dto.rna !== undefined
            ? dto.rna || undefined
            : (existing.rna ?? undefined),
        siret:
          dto.siret !== undefined
            ? dto.siret || undefined
            : (existing.siret ?? undefined),
        address: addressForVerification,
      } as unknown as RegisterAssociationDto;

      const verification =
        await this.associationVerificationService.verifyAssociation(
          verificationInput,
        );

      // Association dissoute → bloquer la mise à jour
      if (verification.rejectionReason) {
        throw new BadRequestException(verification.rejectionReason);
      }

      // Revue manuelle nécessaire → repasser en PENDING
      if (verification.requiresManualReview) {
        await this.prisma.association.update({
          where: { id: associationId },
          data: {
            ...this.buildScalarUpdateData(dto),
            ...this.buildAddressUpsert(dto),
            status: PrismaAssociationStatus.PENDING,
            requiresManualReview: true,
          },
        });
        return this.getAssociation(associationId);
      }
    }

    await this.prisma.association.update({
      where: { id: associationId },
      data: {
        ...this.buildScalarUpdateData(dto),
        ...this.buildAddressUpsert(dto),
      },
    });

    return this.getAssociation(associationId);
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

    // Invalider tous les refresh tokens de l'ancien OWNER (force logout)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: requestingUserId },
    });
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
   * Construit les champs scalaires à mettre à jour (hors adresse).
   * Seuls les champs présents dans le DTO (non `undefined`) sont inclus.
   */
  private buildScalarUpdateData(
    dto: UpdateAssociationDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.rna !== undefined) data.rna = dto.rna || null;
    if (dto.siret !== undefined) data.siret = dto.siret || null;
    if (dto.object !== undefined) data.object = dto.object;
    if (dto.legalStatus !== undefined) data.legalStatus = dto.legalStatus;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.website !== undefined) data.website = dto.website || null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl || null;
    return data;
  }

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
