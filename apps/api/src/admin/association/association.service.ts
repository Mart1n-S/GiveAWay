import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  FILE_SERVICE,
  IFileService,
} from '../../common/files/interfaces/file-service.interface';
import { ConversationService } from '../../messaging/conversation.service';
import {
  AssociationStatus,
  AssociationRole,
  MissionStatus,
} from '../../generated/prisma/client';

@Injectable()
export class AdminAssociationService {
  private readonly logger = new Logger(AdminAssociationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    private readonly conversationService: ConversationService,
  ) {}

  async listPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.association.findMany({
        where: { status: AssociationStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          address: true,
          category: true,
          members: {
            where: { role: AssociationRole.OWNER },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.association.count({
        where: { status: AssociationStatus.PENDING },
      }),
    ]);
    return { items, total, page, limit };
  }

  async list(query: {
    search?: string;
    status?: AssociationStatus;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { siret: { contains: query.search, mode: 'insensitive' } },
        { rna: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.association.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { address: true, category: true },
      }),
      this.prisma.association.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(id: number) {
    const asso = await this.prisma.association.findUnique({
      where: { id },
      include: {
        address: true,
        category: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        missions: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            startDate: true,
          },
        },
        documents: true,
      },
    });
    if (!asso) throw new NotFoundException('Association introuvable');
    return asso;
  }

  private async ownerEmail(associationId: number): Promise<string | null> {
    const owner = await this.prisma.associationUser.findFirst({
      where: { associationId, role: AssociationRole.OWNER },
      include: { user: { select: { email: true } } },
    });
    return owner?.user.email ?? null;
  }

  async validate(id: number) {
    const asso = await this.prisma.association.findUniqueOrThrow({
      where: { id },
    });
    // Accepte PENDING (validation initiale) et REJECTED (re-validation après refus).
    if (
      asso.status !== AssociationStatus.PENDING &&
      asso.status !== AssociationStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Seules les associations en attente ou refusées peuvent être validées',
      );
    }
    const updated = await this.prisma.association.update({
      where: { id },
      data: { status: AssociationStatus.VALIDATED, rejectionReason: null },
    });
    const email = await this.ownerEmail(id);
    if (email) {
      this.mail
        .sendAssociationValidatedEmail(email, asso.name)
        .catch((e) =>
          this.logger.warn(`Email validation failed: ${String(e)}`),
        );
    }
    return updated;
  }

  async reject(id: number, reason: string) {
    const asso = await this.prisma.association.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.association.update({
      where: { id },
      data: { status: AssociationStatus.REJECTED, rejectionReason: reason },
    });
    const email = await this.ownerEmail(id);
    if (email) {
      this.mail
        .sendAssociationRejectedEmail(email, asso.name, reason)
        .catch((e) => this.logger.warn(`Email reject failed: ${String(e)}`));
    }
    return updated;
  }

  /**
   * Suppression définitive d'une association précédemment refusée.
   * - L'association DOIT être en statut REJECTED.
   * - Cascade DB : AssociationUser, AssociationDocument, Mission, etc. (FK Cascade).
   * - Best-effort sur la suppression des fichiers physiques (local/CDN).
   * - Le compte du propriétaire n'est pas touché — il redevient bénévole classique
   *   automatiquement (la relation AssociationUser disparaît).
   */
  async purge(id: number) {
    const asso = await this.prisma.association.findUnique({
      where: { id },
      include: {
        documents: true,
        members: {
          where: { role: AssociationRole.OWNER },
          include: { user: { select: { email: true, firstName: true } } },
        },
      },
    });
    if (!asso) throw new NotFoundException('Association introuvable');
    if (asso.status !== AssociationStatus.REJECTED) {
      throw new BadRequestException(
        'Seule une association refusée peut être supprimée définitivement',
      );
    }

    const owner = asso.members[0]?.user;
    const documents = asso.documents;
    const reason = asso.rejectionReason ?? '';

    // Les conversations ne sont plus liées à une association (modèle 1-1
    // user-à-user). La suppression d'une asso ne supprime donc plus de
    // conversation et n'a pas besoin d'envoyer de notification WS.
    await this.prisma.association.delete({ where: { id } });

    for (const doc of documents) {
      this.fileService
        .deleteFile(doc.fileUrl)
        .catch((e) =>
          this.logger.warn(
            `Suppression fichier impossible (${doc.fileUrl}) : ${String(e)}`,
          ),
        );
    }

    if (owner) {
      this.mail
        .sendAssociationPurgedEmail(owner.email, asso.name, reason)
        .catch((e) => this.logger.warn(`Email purge failed: ${String(e)}`));
    }

    return { deleted: true, message: 'Association supprimée définitivement' };
  }

  async suspend(id: number, reason: string) {
    const asso = await this.prisma.association.findUniqueOrThrow({
      where: { id },
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.association.update({
        where: { id },
        data: { status: AssociationStatus.SUSPENDED, rejectionReason: reason },
      }),
      // Missions devienennt ARCHIVED (récupérables si réactivation)
      this.prisma.mission.updateMany({
        where: { associationId: id, status: MissionStatus.ACTIVE },
        data: { status: MissionStatus.ARCHIVED },
      }),
    ]);

    const email = await this.ownerEmail(id);
    if (email) {
      this.mail
        .sendAssociationSuspendedEmail(email, asso.name, reason)
        .catch((e) => this.logger.warn(`Email suspend failed: ${String(e)}`));
    }
    return updated;
  }

  async reactivate(id: number) {
    const asso = await this.prisma.association.findUniqueOrThrow({
      where: { id },
    });
    if (asso.status !== AssociationStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seules les assos suspendues peuvent être réactivées',
      );
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.association.update({
        where: { id },
        data: { status: AssociationStatus.VALIDATED, rejectionReason: null },
      }),
      this.prisma.mission.updateMany({
        where: { associationId: id, status: MissionStatus.ARCHIVED },
        data: { status: MissionStatus.ACTIVE },
      }),
    ]);
    return updated;
  }

  async requestDocuments(id: number, types: string[], message?: string) {
    const asso = await this.prisma.association.findUniqueOrThrow({
      where: { id },
    });
    const email = await this.ownerEmail(id);
    if (!email) {
      throw new BadRequestException("Aucun owner pour recevoir l'email");
    }
    const contactEmail =
      this.config.get<string>('CONTACT_ADMIN_EMAIL') ||
      'contact.giiveaway@gmail.com';
    await this.mail.sendAssociationDocumentsRequestEmail(
      email,
      asso.name,
      types,
      message,
      contactEmail,
    );
    return { sent: true };
  }

  /**
   * Téléverse un justificatif côté admin pour le compte de l'association.
   * Le document apparaîtra ensuite sur le profil de l'association (côté mobile).
   */
  async uploadDocument(
    associationId: number,
    type: string,
    file: Express.Multer.File,
  ) {
    await this.prisma.association.findUniqueOrThrow({
      where: { id: associationId },
    });
    const result = await this.fileService.uploadFile(
      file,
      'association-documents',
    );
    return this.prisma.associationDocument.create({
      data: {
        associationId,
        fileUrl: result.publicId,
        type,
      },
    });
  }

  async deleteDocument(documentId: number) {
    const doc = await this.prisma.associationDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    await this.prisma.associationDocument.delete({ where: { id: documentId } });
    this.fileService
      .deleteFile(doc.fileUrl)
      .catch((e) =>
        this.logger.warn(
          `Suppression fichier impossible (${doc.fileUrl}) : ${String(e)}`,
        ),
      );
    return { deleted: true };
  }

  async getDocumentForDownload(documentId: number) {
    const doc = await this.prisma.associationDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    return this.fileService.getFileForDownload(doc.fileUrl);
  }

  async listDocuments(id: number) {
    return this.prisma.associationDocument.findMany({
      where: { associationId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMissionById(missionId: number) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        association: { select: { id: true, name: true, status: true } },
        address: true,
        skills: { include: { skill: true } },
        causes: { include: { cause: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return mission;
  }

  async deleteMission(
    missionId: number,
    reason = 'Mission non conforme supprimée par administration',
  ) {
    const mission = await this.prisma.mission.findUniqueOrThrow({
      where: { id: missionId },
      include: {
        association: { select: { name: true } },
        participants: {
          include: { user: { select: { email: true, firstName: true } } },
        },
      },
    });
    if (mission.status === MissionStatus.DELETED) {
      throw new BadRequestException('Mission déjà supprimée');
    }
    await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.DELETED },
    });
    const promises = mission.participants.map((p) =>
      this.mail.sendMissionCancelledEmail(
        p.user.email,
        p.user.firstName,
        mission.title,
        mission.association.name,
        reason,
      ),
    );
    Promise.allSettled(promises).catch((e) =>
      this.logger.warn(`Some cancellation mails failed: ${String(e)}`),
    );
    return { deleted: true };
  }

  async create(data: {
    name: string;
    ownerUserId: number;
    description?: string;
    siret?: string;
    rna?: string;
    phone?: string;
    website?: string;
    categoryId?: number;
    legalStatus?: string;
    object?: string;
  }) {
    const owner = await this.prisma.user.findUnique({
      where: { id: data.ownerUserId },
    });
    if (!owner) throw new BadRequestException('Owner introuvable');

    await this.assertNoActiveDuplicate({
      siret: data.siret,
      rna: data.rna,
      name: data.name,
    });

    const created = await this.prisma.association.create({
      data: {
        name: data.name,
        description: data.description,
        siret: data.siret,
        rna: data.rna,
        phone: data.phone,
        website: data.website || undefined,
        categoryId: data.categoryId,
        legalStatus: data.legalStatus,
        object: data.object,
        status: AssociationStatus.VALIDATED,
        members: {
          create: { userId: data.ownerUserId, role: AssociationRole.OWNER },
        },
      },
    });
    return created;
  }

  /**
   * Bloque la création/mise à jour d'une association si une autre, identifiée
   * par le même SIRET ou RNA (ou à défaut le même nom), est déjà VALIDATED ou
   * en cours de validation (PENDING). `excludeId` permet d'ignorer la fiche
   * en cours d'édition.
   */
  private async assertNoActiveDuplicate(data: {
    siret?: string | null;
    rna?: string | null;
    name?: string;
    excludeId?: number;
  }): Promise<void> {
    const orConditions: Array<Record<string, unknown>> = [];
    if (data.siret) orConditions.push({ siret: data.siret });
    if (data.rna) orConditions.push({ rna: data.rna });
    if (orConditions.length === 0 && data.name) {
      orConditions.push({ name: { equals: data.name, mode: 'insensitive' } });
    }
    if (orConditions.length === 0) return;

    const existing = await this.prisma.association.findFirst({
      where: {
        status: {
          in: [AssociationStatus.PENDING, AssociationStatus.VALIDATED],
        },
        ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
        OR: orConditions,
      },
      select: { name: true, status: true },
    });
    if (existing) {
      const label =
        existing.status === AssociationStatus.VALIDATED
          ? 'déjà validée'
          : 'déjà en cours de validation';
      throw new ConflictException(
        `Une association ${label} existe déjà avec ces informations (${existing.name}).`,
      );
    }
  }

  async update(id: number, data: Record<string, unknown>) {
    await this.prisma.association.findUniqueOrThrow({ where: { id } });
    await this.assertNoActiveDuplicate({
      siret: typeof data.siret === 'string' ? data.siret : undefined,
      rna: typeof data.rna === 'string' ? data.rna : undefined,
      name: typeof data.name === 'string' ? data.name : undefined,
      excludeId: id,
    });
    const cleanData: Record<string, unknown> = {};
    for (const k of [
      'name',
      'description',
      'siret',
      'rna',
      'phone',
      'website',
      'categoryId',
      'legalStatus',
      'object',
    ]) {
      if (data[k] !== undefined) cleanData[k] = data[k] === '' ? null : data[k];
    }
    return this.prisma.association.update({ where: { id }, data: cleanData });
  }

  async delete(
    id: number,
    reason = 'Association supprimée par administration',
  ) {
    const asso = await this.prisma.association.findUniqueOrThrow({
      where: { id },
    });

    // Récupérer les participants pour notification
    const missions = await this.prisma.mission.findMany({
      where: { associationId: id, status: { not: MissionStatus.DELETED } },
      include: {
        participants: {
          include: { user: { select: { email: true, firstName: true } } },
        },
      },
    });

    await this.prisma.$transaction([
      this.prisma.mission.updateMany({
        where: { associationId: id },
        data: { status: MissionStatus.DELETED },
      }),
      this.prisma.association.update({
        where: { id },
        data: { status: AssociationStatus.SUSPENDED, rejectionReason: reason },
      }),
    ]);

    // Notifications fire-and-forget
    const promises: Promise<unknown>[] = [];
    for (const mission of missions) {
      for (const p of mission.participants) {
        promises.push(
          this.mail.sendMissionCancelledEmail(
            p.user.email,
            p.user.firstName,
            mission.title,
            asso.name,
            reason,
          ),
        );
      }
    }
    Promise.allSettled(promises).catch((e) =>
      this.logger.warn(`Some cancellation mails failed: ${String(e)}`),
    );

    return { deleted: true, missionsAffected: missions.length };
  }
}
