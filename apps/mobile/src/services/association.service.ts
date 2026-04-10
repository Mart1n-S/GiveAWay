import { api } from "@/lib/axios";
import type { AssociationCategory, AssociationMapItem } from "@repo/shared";

export interface NearbyFilters {
  categoryIds?: number[];
  createdAfter?: string; // ISO date yyyy-mm-dd
  createdBefore?: string; // ISO date yyyy-mm-dd
}

/**
 * Récupère les associations validées situées dans un rayon donné
 * autour d'un point géographique, avec filtres optionnels.
 */
export async function getNearbyAssociations(
  lat: number,
  lng: number,
  radius = 10,
  filters: NearbyFilters = {},
): Promise<AssociationMapItem[]> {
  const params: Record<string, string> = {
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  };

  if (filters.categoryIds?.length) {
    params.categoryIds = filters.categoryIds.join(",");
  }
  if (filters.createdAfter) {
    params.createdAfter = filters.createdAfter;
  }
  if (filters.createdBefore) {
    params.createdBefore = filters.createdBefore;
  }

  const { data } = await api.get<AssociationMapItem[]>(
    "/associations/nearby",
    { params },
  );
  return data;
}

/**
 * Récupère la liste de toutes les catégories d'associations.
 * Utilisé pour alimenter les filtres de la carte.
 */
export async function getAssociationCategories(): Promise<
  AssociationCategory[]
> {
  const { data } = await api.get<AssociationCategory[]>(
    "/reference/association-categories",
  );
  return data;
}