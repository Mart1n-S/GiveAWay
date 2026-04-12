import Toast from "react-native-toast-message";
import { api } from "@/lib/axios";
import type { AssociationCategory, AssociationMapItem } from "@repo/shared";

/** Filtres optionnels pour la recherche d'associations proches */
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

  try {
    const { data } = await api.get<AssociationMapItem[]>(
      "/associations/nearby",
      { params },
    );
    return data;
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Impossible de charger les associations",
      text2: "Vérifiez votre connexion et réessayez.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
    throw err;
  }
}

/**
 * Récupère la liste de toutes les catégories d'associations.
 * Utilisé pour alimenter les filtres de la carte.
 */
export async function getAssociationCategories(): Promise<
  AssociationCategory[]
> {
  try {
    const { data } = await api.get<AssociationCategory[]>(
      "/reference/association-categories",
    );
    return data;
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Impossible de charger les catégories",
      text2: "Vérifiez votre connexion et réessayez.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
    throw err;
  }
}
