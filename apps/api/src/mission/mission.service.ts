import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MissionDetail,
  MissionListItem,
  MissionListResponse,
  MissionMapItem,
  MissionListQueryDto,
} from '@repo/shared';
import {
  Prisma,
  ActivityType as PrismaActivityType,
  MissionStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_MAP_RESULTS = 500;

@Injectable()
export class MissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne la liste paginée des missions actives avec leurs relations.
   * Filtres optionnels : type d'activité, cause, ville, recherche textuelle.
   *
   * @param query — paramètres validés par MissionListQuerySchema
   *                (page et pageSize ont des défauts Zod : 1 et 12)
   */
  async findAll(query: MissionListQueryDto): Promise<MissionListResponse> {
    const { page, pageSize, type, causeId, city, search } = query;

    const where: Prisma.MissionWhereInput = {
      status: MissionStatus.ACTIVE,
    };

    if (type) {
      where.type = type as PrismaActivityType;
    }

    if (causeId) {
      where.causes = {
        some: { causeId },
      };
    }

    if (city) {
      where.address = {
        city: { contains: city, mode: 'insensitive' },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          association: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [missions, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          hasRegistration: true,
          volunteersNeeded: true,
          durationInt: true,
          frequency: true,
          startDate: true,
          endDate: true,
          association: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          address: {
            select: {
              id: true,
              street: true,
              postalCode: true,
              city: true,
              latitude: true,
              longitude: true,
            },
          },
          causes: {
            select: {
              cause: {
                select: { id: true, label: true },
              },
            },
          },
          skills: {
            select: {
              skill: {
                select: { id: true, label: true },
              },
            },
          },
          volunteerTypes: {
            select: {
              volunteerType: {
                select: { id: true, label: true },
              },
            },
          },
        },
      }),
      this.prisma.mission.count({ where }),
    ]);

    // Aplatir les relations pivot en tableaux simples
    const mapped: MissionListItem[] = missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      hasRegistration: m.hasRegistration,
      volunteersNeeded: m.volunteersNeeded,
      durationInt: m.durationInt,
      frequency: m.frequency,
      startDate: m.startDate,
      endDate: m.endDate,
      association: m.association,
      address: m.address
        ? {
            ...m.address,
            latitude: m.address.latitude ? Number(m.address.latitude) : null,
            longitude: m.address.longitude ? Number(m.address.longitude) : null,
          }
        : null,
      causes: m.causes.map((c) => c.cause),
      skills: m.skills.map((s) => s.skill),
      volunteerTypes: m.volunteerTypes.map((v) => v.volunteerType),
    }));

    return {
      missions: mapped,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Retourne les missions actives ayant une adresse géolocalisée,
   * pour affichage sur la carte interactive.
   * Limité à MAX_MAP_RESULTS résultats pour éviter les surcharges.
   */
  async findForMap(): Promise<MissionMapItem[]> {
    const missions = await this.prisma.mission.findMany({
      where: {
        status: MissionStatus.ACTIVE,
        address: {
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      take: MAX_MAP_RESULTS,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        address: {
          select: {
            city: true,
            latitude: true,
            longitude: true,
          },
        },
        association: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    return missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      latitude: Number(m.address.latitude),
      longitude: Number(m.address.longitude),
      city: m.address.city ?? null,
      association: m.association,
    }));
  }

  /**
   * Retourne le détail complet d'une mission par son ID.
   * Inclut les publics ciblés et le nombre de participants.
   * @throws NotFoundException si la mission n'existe pas
   */
  async findById(id: number): Promise<MissionDetail> {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        hasRegistration: true,
        volunteersNeeded: true,
        durationInt: true,
        frequency: true,
        startDate: true,
        endDate: true,
        association: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            description: true,
            website: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            postalCode: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
        causes: {
          select: { cause: { select: { id: true, label: true } } },
        },
        skills: {
          select: { skill: { select: { id: true, label: true } } },
        },
        volunteerTypes: {
          select: { volunteerType: { select: { id: true, label: true } } },
        },
        publicTypes: {
          select: { publicType: { select: { id: true, label: true } } },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission #${id} introuvable`);
    }

    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      type: mission.type,
      status: mission.status,
      hasRegistration: mission.hasRegistration,
      volunteersNeeded: mission.volunteersNeeded,
      durationInt: mission.durationInt,
      frequency: mission.frequency,
      startDate: mission.startDate,
      endDate: mission.endDate,
      participantsCount: mission._count.participants,
      association: mission.association,
      address: mission.address
        ? {
            ...mission.address,
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
    };
  }
}
