import { Injectable } from '@nestjs/common';
import { AssociationMapItem } from '@repo/shared';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RADIUS_KM = 50;

export interface NearbyFilters {
  categoryIds?: number[];
  createdAfter?: Date;
  createdBefore?: Date;
}

@Injectable()
export class AssociationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne les associations validées situées dans un rayon donné
   * autour d'un point géographique, en utilisant la formule de Haversine.
   * Supporte un filtre optionnel par catégorie et par date de création.
   *
   * @param lat       - Latitude du centre (degrés décimaux)
   * @param lng       - Longitude du centre (degrés décimaux)
   * @param radiusKm  - Rayon de recherche en km (max 50, défaut 10)
   * @param filters   - Filtres optionnels (catégories, dates)
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm = 10,
    filters: NearbyFilters = {},
  ): Promise<AssociationMapItem[]> {
    const clampedRadius = Math.min(radiusKm, MAX_RADIUS_KM);

    const categoryFilter =
      filters.categoryIds && filters.categoryIds.length > 0
        ? Prisma.sql`AND a.category_id = ANY(ARRAY[${Prisma.join(filters.categoryIds)}]::int[])`
        : Prisma.empty;

    const createdAfterFilter = filters.createdAfter
      ? Prisma.sql`AND a.created_at >= ${filters.createdAfter}`
      : Prisma.empty;

    const createdBeforeFilter = filters.createdBefore
      ? Prisma.sql`AND a.created_at <= ${filters.createdBefore}`
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
      WHERE sub.distance <= ${clampedRadius}
      ORDER BY sub.distance
    `;
  }
}