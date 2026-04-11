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
  AvailabilityType as PrismaAvailabilityType,
  MissionFrequency as PrismaMissionFrequency,
  MissionStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_MAP_RESULTS = 500;

@Injectable()
export class MissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne la liste paginée des missions actives avec leurs relations.
   * Filtres optionnels : types, causes, compétences, publics, bénévoles, ville,
   * fréquence, plage de dates, mode présentiel/distanciel.
   *
   * @param query — paramètres validés par MissionListQuerySchema
   */
  async findAll(query: MissionListQueryDto): Promise<MissionListResponse> {
    const {
      page,
      pageSize,
      type,
      types,
      causeId,
      causeIds,
      skillIds,
      publicTypeIds,
      volunteerTypeIds,
      city,
      search,
      frequency,
      startDateFrom,
      startDateTo,
      hasAvailableSpots,
      locationMode,
    } = query;

    const where: Prisma.MissionWhereInput = {
      status: MissionStatus.ACTIVE,
    };

    // ── Mode localisation ───────────────────────────────────────────────────
    if (locationMode === 'remote') {
      where.availabilityType = PrismaAvailabilityType.REMOTE;
    } else if (locationMode === 'nearby') {
      where.availabilityType = {
        in: [PrismaAvailabilityType.ON_SITE, PrismaAvailabilityType.HYBRID],
      };
    }

    // ── Types d'activités ───────────────────────────────────────────────────
    // Préfère le tableau (types) sur la valeur unique (type)
    const activeTypes = types?.length ? types : type ? [type] : undefined;
    if (activeTypes?.length) {
      where.type = { in: activeTypes as PrismaActivityType[] };
    }

    // ── Causes ─────────────────────────────────────────────────────────────
    const activeCauseIds = causeIds?.length
      ? causeIds
      : causeId
        ? [causeId]
        : undefined;
    if (activeCauseIds?.length) {
      where.causes = { some: { causeId: { in: activeCauseIds } } };
    }

    // ── Compétences ────────────────────────────────────────────────────────
    if (skillIds?.length) {
      where.skills = { some: { skillId: { in: skillIds } } };
    }

    // ── Publics ciblés ──────────────────────────────────────────────────────
    if (publicTypeIds?.length) {
      where.publicTypes = { some: { publicTypeId: { in: publicTypeIds } } };
    }

    // ── Types de bénévoles ──────────────────────────────────────────────────
    if (volunteerTypeIds?.length) {
      where.volunteerTypes = {
        some: { volunteerTypeId: { in: volunteerTypeIds } },
      };
    }

    // ── Ville ───────────────────────────────────────────────────────────────
    if (city) {
      where.address = {
        city: { contains: city, mode: 'insensitive' },
      };
    }

    // ── Fréquence ───────────────────────────────────────────────────────────
    if (frequency) {
      where.frequency = frequency as PrismaMissionFrequency;
    }

    // ── Plage de dates ──────────────────────────────────────────────────────
    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) {
        (where.startDate as Prisma.DateTimeNullableFilter).gte = new Date(
          startDateFrom,
        );
      }
      if (startDateTo) {
        (where.startDate as Prisma.DateTimeNullableFilter).lte = new Date(
          startDateTo,
        );
      }
    }

    // ── Recherche textuelle ─────────────────────────────────────────────────
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

    // ── Places disponibles ──────────────────────────────────────────────────
    // TODO: Prisma ne supporte pas nativement la comparaison _count vs champ.
    // Pour la pagination, on pré-filtre sur volunteersNeeded != null et on
    // délègue le filtrage exact à la couche JS post-fetch si le volume le permet.
    // Pour les grands volumes, privilégier une vue SQL matérialisée.
    if (hasAvailableSpots) {
      where.volunteersNeeded = { not: null };
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
          availabilityType: true,
          hasRegistration: true,
          volunteersNeeded: true,
          durationInt: true,
          frequency: true,
          startDate: true,
          endDate: true,
          _count: { select: { participants: true } },
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

    // Filtre JS post-fetch pour hasAvailableSpots (complément au filtre Prisma partiel)
    const filtered = hasAvailableSpots
      ? missions.filter(
          (m) =>
            m.volunteersNeeded !== null &&
            m._count.participants < m.volunteersNeeded,
        )
      : missions;

    // Aplatir les relations pivot en tableaux simples
    const mapped: MissionListItem[] = filtered.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      availabilityType: m.availabilityType,
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
      total: hasAvailableSpots ? filtered.length : total,
      page,
      pageSize,
    };
  }

  /**
   * Retourne les missions actives ayant une adresse géolocalisée,
   * pour affichage sur la carte interactive.
   * Supporte les mêmes filtres que findAll (sauf pagination).
   * Limité à MAX_MAP_RESULTS résultats.
   */
  async findForMap(
    query?: Partial<MissionListQueryDto>,
  ): Promise<MissionMapItem[]> {
    const where: Prisma.MissionWhereInput = {
      status: MissionStatus.ACTIVE,
      address: {
        latitude: { not: null },
        longitude: { not: null },
      },
    };

    if (!query) {
      // Aucun filtre — fallback pour MarketingView et rétro-compat
    } else {
      const {
        type,
        types,
        causeId,
        causeIds,
        skillIds,
        publicTypeIds,
        volunteerTypeIds,
        city,
        frequency,
        startDateFrom,
        startDateTo,
        hasAvailableSpots,
        locationMode,
      } = query;

      // Mode localisation
      if (locationMode === 'remote') {
        where.availabilityType = PrismaAvailabilityType.REMOTE;
      } else if (locationMode === 'nearby') {
        where.availabilityType = {
          in: [PrismaAvailabilityType.ON_SITE, PrismaAvailabilityType.HYBRID],
        };
      }

      // Types
      const activeTypes = types?.length ? types : type ? [type] : undefined;
      if (activeTypes?.length) {
        where.type = { in: activeTypes as PrismaActivityType[] };
      }

      // Causes
      const activeCauseIds = causeIds?.length
        ? causeIds
        : causeId
          ? [causeId]
          : undefined;
      if (activeCauseIds?.length) {
        where.causes = { some: { causeId: { in: activeCauseIds } } };
      }

      if (skillIds?.length) {
        where.skills = { some: { skillId: { in: skillIds } } };
      }

      if (publicTypeIds?.length) {
        where.publicTypes = { some: { publicTypeId: { in: publicTypeIds } } };
      }

      if (volunteerTypeIds?.length) {
        where.volunteerTypes = {
          some: { volunteerTypeId: { in: volunteerTypeIds } },
        };
      }

      if (city) {
        // Reconstruire le filtre address en incluant ville + coordonnées
        where.address = {
          latitude: { not: null },
          longitude: { not: null },
          city: { contains: city, mode: 'insensitive' },
        };
      }

      if (frequency) {
        where.frequency = frequency as PrismaMissionFrequency;
      }

      if (startDateFrom || startDateTo) {
        where.startDate = {};
        if (startDateFrom) {
          (where.startDate as Prisma.DateTimeNullableFilter).gte = new Date(
            startDateFrom,
          );
        }
        if (startDateTo) {
          (where.startDate as Prisma.DateTimeNullableFilter).lte = new Date(
            startDateTo,
          );
        }
      }

      if (hasAvailableSpots) {
        where.volunteersNeeded = { not: null };
      }
    }

    const missions = await this.prisma.mission.findMany({
      where,
      take: MAX_MAP_RESULTS,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        availabilityType: true,
        volunteersNeeded: true,
        _count: { select: { participants: true } },
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

    // Filtre JS post-fetch pour hasAvailableSpots
    const filtered = query?.hasAvailableSpots
      ? missions.filter(
          (m) =>
            m.volunteersNeeded !== null &&
            m._count.participants < m.volunteersNeeded,
        )
      : missions;

    return filtered.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      availabilityType: m.availabilityType,
      latitude: Number(m.address.latitude),
      longitude: Number(m.address.longitude),
      city: m.address.city ?? null,
      association: m.association,
    }));
  }

  /**
   * Retourne le détail complet d'une mission par son ID.
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
        availabilityType: true,
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
      availabilityType: mission.availabilityType,
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
