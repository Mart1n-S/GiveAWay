import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssociationMissionItem,
  AssociationMissionDashboard,
  AssociationMissionStats,
  MissionStatsByType,
  MissionStatsByMonth,
  MissionStatsTopItem,
  StatsQueryDto,
  CreateMissionDto,
  UpdateMissionDto,
  ActivityType,
  MissionParticipantsResponse,
  MissionParticipantProfile,
} from '@repo/shared';
import {
  MissionStatus,
  AssociationStatus,
  Prisma,
  ActivityType as PrismaActivityType,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// Type interne pour le résultat de la requête Prisma avec relations
type MissionWithRelations = Prisma.MissionGetPayload<{
  include: {
    address: true;
    causes: { include: { cause: true } };
    skills: { include: { skill: true } };
    volunteerTypes: { include: { volunteerType: true } };
    publicTypes: { include: { publicType: true } };
    _count: { select: { participants: true } };
  };
}>;

const MISSION_INCLUDE = {
  address: true,
  causes: { include: { cause: true } },
  skills: { include: { skill: true } },
  volunteerTypes: { include: { volunteerType: true } },
  publicTypes: { include: { publicType: true } },
  _count: { select: { participants: true } },
} as const;

@Injectable()
export class AssociationMissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ----------------------------------------------------------------
  // CREATE — crée directement une mission ACTIVE
  // ----------------------------------------------------------------
  async create(
    associationId: number,
    dto: CreateMissionDto,
  ): Promise<AssociationMissionItem> {
    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      select: { status: true },
    });

    if (!association) {
      throw new NotFoundException(`Association #${associationId} introuvable`);
    }

    if (association.status !== AssociationStatus.VALIDATED) {
      throw new ForbiddenException(
        'Votre association doit être validée pour gérer des missions',
      );
    }

    if (dto.skillIds?.length) {
      await this.verifyRefIds('skill', dto.skillIds);
    }
    if (dto.causeIds?.length) {
      await this.verifyRefIds('cause', dto.causeIds);
    }
    if (dto.publicTypeIds?.length) {
      await this.verifyRefIds('publicType', dto.publicTypeIds);
    }
    if (dto.volunteerTypeIds?.length) {
      await this.verifyRefIds('volunteerType', dto.volunteerTypeIds);
    }

    const addressId = dto.address
      ? await this.upsertAddress(dto.address)
      : null;

    const mission = await this.prisma.mission.create({
      data: {
        associationId,
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        availabilityType: (dto.availabilityType as any) ?? null,
        hasRegistration: dto.hasRegistration,
        volunteersNeeded: dto.volunteersNeeded ?? null,
        durationInt: dto.durationInt ?? null,
        frequency: (dto.frequency as any) ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        addressId,
        status: MissionStatus.ACTIVE,
        ...(dto.skillIds?.length
          ? { skills: { create: dto.skillIds.map((id) => ({ skillId: id })) } }
          : {}),
        ...(dto.causeIds?.length
          ? { causes: { create: dto.causeIds.map((id) => ({ causeId: id })) } }
          : {}),
        ...(dto.publicTypeIds?.length
          ? {
              publicTypes: {
                create: dto.publicTypeIds.map((id) => ({ publicTypeId: id })),
              },
            }
          : {}),
        ...(dto.volunteerTypeIds?.length
          ? {
              volunteerTypes: {
                create: dto.volunteerTypeIds.map((id) => ({
                  volunteerTypeId: id,
                })),
              },
            }
          : {}),
      },
      include: MISSION_INCLUDE,
    });

    return this.mapToDto(mission);
  }

  // ----------------------------------------------------------------
  // GET DASHBOARD — 4 onglets: active | upcoming | past | archived
  // ----------------------------------------------------------------
  async getDashboard(
    associationId: number,
  ): Promise<AssociationMissionDashboard> {
    const missions = await this.prisma.mission.findMany({
      where: {
        associationId,
        status: { not: MissionStatus.DELETED },
      },
      include: MISSION_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();

    const active: MissionWithRelations[] = [];
    const upcoming: MissionWithRelations[] = [];
    const past: MissionWithRelations[] = [];
    const archived: MissionWithRelations[] = [];

    for (const m of missions) {
      if (m.status === MissionStatus.ARCHIVED) {
        archived.push(m);
        continue;
      }
      // status === ACTIVE
      if (m.startDate && m.startDate > now) {
        upcoming.push(m);
        continue;
      }
      if (m.endDate && m.endDate < now) {
        past.push(m);
        continue;
      }
      active.push(m);
    }

    // Tri des groupes
    active.sort(
      (a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0),
    );
    upcoming.sort(
      (a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0),
    );
    past.sort(
      (a, b) =>
        (b.endDate?.getTime() ?? b.updatedAt.getTime()) -
        (a.endDate?.getTime() ?? a.updatedAt.getTime()),
    );

    const toItems = (list: MissionWithRelations[]) =>
      list.map((m) => this.mapToDto(m));

    return {
      missions: {
        active: toItems(active),
        upcoming: toItems(upcoming),
        past: toItems(past),
        archived: toItems(archived),
      },
      counts: {
        active: active.length,
        upcoming: upcoming.length,
        past: past.length,
        archived: archived.length,
      },
    };
  }

  // ----------------------------------------------------------------
  // GET STATISTICS — KPIs, par type, par mois, top missions
  // ----------------------------------------------------------------
  async getStats(
    associationId: number,
    query: StatsQueryDto,
  ): Promise<AssociationMissionStats> {
    const MONTHS_FR = [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Jun',
      'Jul',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ];

    const TYPE_LABELS: Record<string, string> = {
      MISSION: 'Mission',
      EVENT: 'Événement',
      COLLECT: 'Collecte',
      INFO: 'Information',
    };

    const dateFilter =
      query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate && { gte: new Date(query.startDate) }),
              ...(query.endDate && { lte: new Date(query.endDate) }),
            },
          }
        : {};

    const where: Prisma.MissionWhereInput = {
      associationId,
      status: { not: MissionStatus.DELETED },
      ...(query.missionType && {
        type: query.missionType as PrismaActivityType,
      }),
      ...dateFilter,
    };

    const missions = await this.prisma.mission.findMany({
      where,
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    let activeMissions = 0;
    let pastMissions = 0;
    let archivedMissions = 0;
    let totalParticipants = 0;

    const typeMap = new Map<string, { count: number; participants: number }>();
    const monthMap = new Map<
      string,
      { missions: number; participants: number }
    >();

    for (const m of missions) {
      const pCount = m._count.participants;
      totalParticipants += pCount;

      if (m.status === MissionStatus.ARCHIVED) {
        archivedMissions++;
      } else if (m.endDate && m.endDate < now) {
        pastMissions++;
      } else {
        activeMissions++;
      }

      const typeEntry = typeMap.get(m.type) ?? { count: 0, participants: 0 };
      typeMap.set(m.type, {
        count: typeEntry.count + 1,
        participants: typeEntry.participants + pCount,
      });

      const d = m.createdAt;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthEntry = monthMap.get(monthKey) ?? {
        missions: 0,
        participants: 0,
      };
      monthMap.set(monthKey, {
        missions: monthEntry.missions + 1,
        participants: monthEntry.participants + pCount,
      });
    }

    const byType: MissionStatsByType[] = Array.from(typeMap.entries()).map(
      ([type, data]) => ({
        type: type as ActivityType,
        label: TYPE_LABELS[type] ?? type,
        count: data.count,
        participants: data.participants,
      }),
    );

    const byMonth: MissionStatsByMonth[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        return {
          month: key,
          label: `${MONTHS_FR[Number.parseInt(month, 10) - 1]} ${year}`,
          missions: data.missions,
          participants: data.participants,
        };
      });

    // Tendance des inscriptions basée sur MissionParticipant.createdAt
    const missionIds = missions.map((m) => m.id);
    const participantRows =
      missionIds.length > 0
        ? await this.prisma.missionParticipant.findMany({
            where: {
              missionId: { in: missionIds },
              ...(query.startDate || query.endDate
                ? {
                    createdAt: {
                      ...(query.startDate && {
                        gte: new Date(query.startDate),
                      }),
                      ...(query.endDate && { lte: new Date(query.endDate) }),
                    },
                  }
                : {}),
            },
            select: { createdAt: true },
          })
        : [];

    const partMonthMap = new Map<string, number>();
    for (const p of participantRows) {
      const d = p.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      partMonthMap.set(key, (partMonthMap.get(key) ?? 0) + 1);
    }

    const participationByMonth: MissionStatsByMonth[] = Array.from(
      partMonthMap.entries(),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        return {
          month: key,
          label: `${MONTHS_FR[Number.parseInt(month, 10) - 1]} ${year}`,
          missions: 0,
          participants: count,
        };
      });

    const topMissions: MissionStatsTopItem[] = [...missions]
      .sort((a, b) => b._count.participants - a._count.participants)
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        title: m.title,
        participantsCount: m._count.participants,
        type: m.type as ActivityType,
      }));

    return {
      summary: {
        totalMissions: missions.length,
        activeMissions,
        pastMissions,
        archivedMissions,
        totalParticipants,
        averageParticipantsPerMission:
          missions.length > 0
            ? Math.round((totalParticipants / missions.length) * 10) / 10
            : 0,
      },
      byType,
      byMonth,
      participationByMonth,
      topMissions,
    };
  }

  // ----------------------------------------------------------------
  // FIND ONE
  // ----------------------------------------------------------------
  async findOne(
    associationId: number,
    missionId: number,
  ): Promise<AssociationMissionItem> {
    const mission = await this.verifyOwnership(associationId, missionId);
    return this.mapToDto(mission);
  }

  // ----------------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------------
  async update(
    associationId: number,
    missionId: number,
    dto: UpdateMissionDto,
  ): Promise<AssociationMissionItem> {
    const mission = await this.verifyOwnership(associationId, missionId);

    if (
      mission.status === MissionStatus.ARCHIVED ||
      mission.status === MissionStatus.DELETED
    ) {
      throw new UnprocessableEntityException(
        'Les missions archivées ne peuvent pas être modifiées',
      );
    }

    const warnings: string[] = [];
    const hasParticipants = mission._count.participants > 0;

    const majorChanges: string[] = [];
    if (hasParticipants) {
      if (dto.address !== undefined) {
        const prev = mission.address;
        const changed =
          dto.address?.street !== prev?.street ||
          dto.address?.postalCode !== prev?.postalCode ||
          dto.address?.city !== prev?.city;
        if (changed) {
          warnings.push(
            "L'adresse a été modifiée. Des bénévoles sont déjà inscrits à cette mission.",
          );
          majorChanges.push("L'adresse de la mission a été modifiée.");
        }
      }
      if (dto.startDate !== undefined || dto.endDate !== undefined) {
        warnings.push(
          'Les dates ont été modifiées. Des bénévoles sont déjà inscrits à cette mission.',
        );
        majorChanges.push('Les dates de la mission ont été modifiées.');
      }
    }

    if (dto.skillIds?.length) {
      await this.verifyRefIds('skill', dto.skillIds);
    }
    if (dto.causeIds?.length) {
      await this.verifyRefIds('cause', dto.causeIds);
    }
    if (dto.publicTypeIds?.length) {
      await this.verifyRefIds('publicType', dto.publicTypeIds);
    }
    if (dto.volunteerTypeIds?.length) {
      await this.verifyRefIds('volunteerType', dto.volunteerTypeIds);
    }

    let addressId: number | null | undefined;
    if (dto.address !== undefined) {
      addressId = dto.address ? await this.upsertAddress(dto.address) : null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.skillIds !== undefined) {
        await tx.missionSkill.deleteMany({ where: { missionId } });
        if (dto.skillIds.length) {
          await tx.missionSkill.createMany({
            data: dto.skillIds.map((id) => ({ missionId, skillId: id })),
          });
        }
      }
      if (dto.causeIds !== undefined) {
        await tx.missionCause.deleteMany({ where: { missionId } });
        if (dto.causeIds.length) {
          await tx.missionCause.createMany({
            data: dto.causeIds.map((id) => ({ missionId, causeId: id })),
          });
        }
      }
      if (dto.publicTypeIds !== undefined) {
        await tx.missionPublicType.deleteMany({ where: { missionId } });
        if (dto.publicTypeIds.length) {
          await tx.missionPublicType.createMany({
            data: dto.publicTypeIds.map((id) => ({
              missionId,
              publicTypeId: id,
            })),
          });
        }
      }
      if (dto.volunteerTypeIds !== undefined) {
        await tx.missionVolunteerType.deleteMany({ where: { missionId } });
        if (dto.volunteerTypeIds.length) {
          await tx.missionVolunteerType.createMany({
            data: dto.volunteerTypeIds.map((id) => ({
              missionId,
              volunteerTypeId: id,
            })),
          });
        }
      }

      return tx.mission.update({
        where: { id: missionId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.type !== undefined && { type: dto.type as any }),
          ...(dto.availabilityType !== undefined && {
            availabilityType: (dto.availabilityType as any) ?? null,
          }),
          ...(dto.hasRegistration !== undefined && {
            hasRegistration: dto.hasRegistration,
          }),
          ...(dto.volunteersNeeded !== undefined && {
            volunteersNeeded: dto.volunteersNeeded,
          }),
          ...(dto.durationInt !== undefined && {
            durationInt: dto.durationInt,
          }),
          ...(dto.frequency !== undefined && {
            frequency: (dto.frequency as any) ?? null,
          }),
          ...(dto.startDate !== undefined && {
            startDate: dto.startDate ? new Date(dto.startDate) : null,
          }),
          ...(dto.endDate !== undefined && {
            endDate: dto.endDate ? new Date(dto.endDate) : null,
          }),
          ...(addressId !== undefined && { addressId }),
        },
        include: MISSION_INCLUDE,
      });
    });

    if (majorChanges.length > 0) {
      const association = await this.prisma.association.findUnique({
        where: { id: associationId },
        select: { name: true },
      });
      const participants = await this.prisma.missionParticipant.findMany({
        where: { missionId },
        select: { user: { select: { email: true, firstName: true } } },
      });
      Promise.allSettled(
        participants.map((p) =>
          this.mail.sendMissionUpdatedEmail(
            p.user.email,
            p.user.firstName,
            updated.title,
            association?.name ?? '',
            majorChanges,
          ),
        ),
      );
    }

    return { ...this.mapToDto(updated), warnings };
  }

  // ----------------------------------------------------------------
  // ARCHIVE (ACTIVE → ARCHIVED)
  // ----------------------------------------------------------------
  async archive(
    associationId: number,
    missionId: number,
  ): Promise<AssociationMissionItem> {
    const mission = await this.verifyOwnership(associationId, missionId);

    if (
      mission.status === MissionStatus.ARCHIVED ||
      mission.status === MissionStatus.DELETED
    ) {
      throw new UnprocessableEntityException(
        'Cette mission est déjà archivée ou supprimée',
      );
    }

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.ARCHIVED },
      include: MISSION_INCLUDE,
    });
    return this.mapToDto(updated);
  }

  // ----------------------------------------------------------------
  // UNARCHIVE (ARCHIVED → ACTIVE)
  // ----------------------------------------------------------------
  async unarchive(
    associationId: number,
    missionId: number,
  ): Promise<AssociationMissionItem> {
    const mission = await this.verifyOwnership(associationId, missionId);

    if (mission.status !== MissionStatus.ARCHIVED) {
      throw new UnprocessableEntityException(
        'Seules les missions archivées peuvent être désarchivées',
      );
    }

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.ACTIVE },
      include: MISSION_INCLUDE,
    });
    return this.mapToDto(updated);
  }

  // ----------------------------------------------------------------
  // DELETE (soft — notifie les participants par email)
  // ----------------------------------------------------------------
  async delete(associationId: number, missionId: number): Promise<void> {
    const mission = await this.verifyOwnership(associationId, missionId);

    if (mission.status === MissionStatus.ARCHIVED) {
      throw new UnprocessableEntityException(
        'Les missions archivées ne peuvent pas être supprimées',
      );
    }

    if (mission._count.participants > 0) {
      const [association, participants] = await Promise.all([
        this.prisma.association.findUnique({
          where: { id: associationId },
          select: { name: true },
        }),
        this.prisma.missionParticipant.findMany({
          where: { missionId },
          select: { user: { select: { email: true, firstName: true } } },
        }),
      ]);

      await this.prisma.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.DELETED },
      });

      Promise.allSettled(
        participants.map((p) =>
          this.mail.sendMissionDeletedEmail(
            p.user.email,
            p.user.firstName,
            mission.title,
            association?.name ?? '',
          ),
        ),
      );
      return;
    }

    await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.DELETED },
    });
  }

  // ----------------------------------------------------------------
  // GET PARTICIPANTS — liste des inscrits avec extrait de profil
  // ----------------------------------------------------------------
  async getParticipants(
    associationId: number,
    missionId: number,
  ): Promise<MissionParticipantsResponse> {
    const mission = await this.verifyOwnership(associationId, missionId);

    const now = new Date();
    const isArchived = mission.status === MissionStatus.ARCHIVED;
    const isPast = !!(mission.endDate && mission.endDate < now);
    const canRemove = !isArchived && !isPast;

    const rows = await this.prisma.missionParticipant.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          include: {
            skills: { include: { skill: true } },
            causes: { include: { cause: true } },
            availability: true,
          },
        },
      },
    });

    const userIds = rows.map((r) => r.userId);

    const completedCounts =
      userIds.length > 0
        ? await this.prisma.missionParticipant.groupBy({
            by: ['userId'],
            where: {
              userId: { in: userIds },
              missionId: { not: missionId },
              mission: {
                associationId,
                endDate: { lt: now },
                status: { not: MissionStatus.DELETED },
              },
            },
            _count: { userId: true },
          })
        : [];

    const countMap = new Map(
      completedCounts.map((r) => [r.userId, r._count.userId]),
    );

    const participants: MissionParticipantProfile[] = rows.map((r) => ({
      userId: r.userId,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      age: r.user.age,
      profilePicture: r.user.profilePicture,
      skills: r.user.skills.map((s) => s.skill),
      causes: r.user.causes.map((c) => c.cause),
      availability: r.user.availability
        ? {
            frequency: r.user.availability.frequency as any,
            timeSlots: r.user.availability.timeSlot as any,
            type: r.user.availability.type as any,
          }
        : null,
      completedMissionsCount: countMap.get(r.userId) ?? 0,
      joinedAt: r.createdAt,
    }));

    return { participants, total: participants.length, canRemove };
  }

  // ----------------------------------------------------------------
  // REMOVE PARTICIPANT — retire un bénévole et l'en notifie
  // ----------------------------------------------------------------
  async removeParticipant(
    associationId: number,
    missionId: number,
    userId: number,
  ): Promise<void> {
    const mission = await this.verifyOwnership(associationId, missionId);

    const now = new Date();
    if (
      mission.status === MissionStatus.ARCHIVED ||
      (mission.endDate && mission.endDate < now)
    ) {
      throw new ForbiddenException(
        "Impossible de retirer un participant d'une mission terminée ou archivée",
      );
    }

    const participant = await this.prisma.missionParticipant.findUnique({
      where: { missionId_userId: { missionId, userId } },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (!participant) {
      throw new NotFoundException(
        `L'utilisateur #${userId} n'est pas inscrit à cette mission`,
      );
    }

    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      select: { name: true },
    });

    await this.prisma.missionParticipant.delete({
      where: { missionId_userId: { missionId, userId } },
    });

    Promise.allSettled([
      this.mail.sendParticipantRemovedEmail(
        participant.user.email,
        participant.user.firstName,
        mission.title,
        association?.name ?? '',
      ),
    ]);
  }

  // ----------------------------------------------------------------
  // Helpers privés
  // ----------------------------------------------------------------

  private async verifyOwnership(
    associationId: number,
    missionId: number,
  ): Promise<MissionWithRelations> {
    const mission = await this.prisma.mission.findFirst({
      where: {
        id: missionId,
        associationId,
        status: { not: MissionStatus.DELETED },
      },
      include: MISSION_INCLUDE,
    });

    if (!mission) {
      throw new NotFoundException(`Mission #${missionId} introuvable`);
    }

    return mission;
  }

  private async upsertAddress(address: {
    street: string;
    postalCode: string;
    city: string;
    latitude?: number;
    longitude?: number;
  }): Promise<number> {
    const existing = await this.prisma.address.findFirst({
      where: {
        street: address.street,
        postalCode: address.postalCode,
        city: address.city,
      },
      select: { id: true },
    });

    if (existing) return existing.id;

    const created = await this.prisma.address.create({
      data: {
        street: address.street,
        postalCode: address.postalCode,
        city: address.city,
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      },
      select: { id: true },
    });

    return created.id;
  }

  private async verifyRefIds(
    model: 'skill' | 'cause' | 'publicType' | 'volunteerType',
    ids: number[],
  ): Promise<void> {
    const labels: Record<typeof model, string> = {
      skill: 'Compétence',
      cause: 'Cause',
      publicType: 'Public ciblé',
      volunteerType: 'Type de bénévole',
    };

    for (const id of ids) {
      const record = await (this.prisma as any)[model].findUnique({
        where: { id },
        select: { id: true },
      });
      if (!record) {
        throw new UnprocessableEntityException(
          `${labels[model]} #${id} introuvable`,
        );
      }
    }
  }

  private mapToDto(mission: MissionWithRelations): AssociationMissionItem {
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      type: mission.type as any,
      availabilityType: (mission.availabilityType as any) ?? null,
      status: mission.status as any,
      hasRegistration: mission.hasRegistration,
      volunteersNeeded: mission.volunteersNeeded,
      durationInt: mission.durationInt,
      frequency: (mission.frequency as any) ?? null,
      startDate: mission.startDate,
      endDate: mission.endDate,
      participantsCount: mission._count.participants,
      address: mission.address
        ? {
            id: mission.address.id,
            street: mission.address.street,
            postalCode: mission.address.postalCode,
            city: mission.address.city,
            latitude: mission.address.latitude
              ? Number(mission.address.latitude)
              : null,
            longitude: mission.address.longitude
              ? Number(mission.address.longitude)
              : null,
          }
        : null,
      causes: mission.causes.map((c) => c.cause),
      skills: mission.skills.map((s) => s.skill),
      volunteerTypes: mission.volunteerTypes.map((v) => v.volunteerType),
      publicTypes: mission.publicTypes.map((p) => p.publicType),
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    };
  }
}
