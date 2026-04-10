import { Injectable } from '@nestjs/common';
import { MissionListItem, MissionListResponse } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

interface FindAllOptions {
  page?: number;
  pageSize?: number;
  type?: string;
  causeId?: number;
  city?: string;
  search?: string;
}

@Injectable()
export class MissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne la liste paginée des missions actives avec leurs relations.
   * Filtres optionnels : type d'activité, cause, ville, recherche textuelle.
   */
  async findAll(options: FindAllOptions = {}): Promise<MissionListResponse> {
    const {
      page = 1,
      pageSize = 12,
      type,
      causeId,
      city,
      search,
    } = options;

    const where: any = {
      status: 'ACTIVE',
    };

    if (type) {
      where.type = type;
    }

    if (causeId) {
      where.causes = {
        some: { causeId: Number(causeId) },
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
            latitude: m.address.latitude
              ? Number(m.address.latitude)
              : null,
            longitude: m.address.longitude
              ? Number(m.address.longitude)
              : null,
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
}
