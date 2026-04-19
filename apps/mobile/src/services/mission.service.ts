import Toast from "react-native-toast-message";
import { api } from "../lib/axios";
import {
  MissionDetail,
  MissionListResponse,
  MissionListQuery,
  MissionMapItem,
} from "@repo/shared";

/** Référence légère — cause, compétence, public, type bénévole */
export interface RefItem {
  id: number;
  label: string;
}

/** Sérialise un tableau d'IDs en string CSV pour les query params */
function serializeIds(ids: number[]): string {
  return ids.join(",");
}

/** Construit les query params à partir d'un MissionListQuery */
function buildParams(query: MissionListQuery): Record<string, string> {
  const p: Record<string, string> = {};

  if (query.page) p.page = String(query.page);
  if (query.pageSize) p.pageSize = String(query.pageSize);
  if (query.locationMode) p.locationMode = query.locationMode;
  if (query.search) p.search = query.search;
  if (query.city) p.city = query.city;
  if (query.frequency) p.frequency = query.frequency;
  if (query.startDateFrom) p.startDateFrom = query.startDateFrom;
  if (query.startDateTo) p.startDateTo = query.startDateTo;
  if (query.hasAvailableSpots !== undefined) {
    p.hasAvailableSpots = String(query.hasAvailableSpots);
  }
  if (query.associationId !== undefined) {
    p.associationId = String(query.associationId);
  }

  // Préfère les tableaux aux valeurs singulières
  if (query.types?.length) {
    p.types = query.types.join(",");
  } else if (query.type) {
    p.type = query.type;
  }

  if (query.causeIds?.length) {
    p.causeIds = serializeIds(query.causeIds);
  } else if (query.causeId) {
    p.causeId = String(query.causeId);
  }

  if (query.skillIds?.length) p.skillIds = serializeIds(query.skillIds);
  if (query.publicTypeIds?.length)
    p.publicTypeIds = serializeIds(query.publicTypeIds);
  if (query.volunteerTypeIds?.length)
    p.volunteerTypeIds = serializeIds(query.volunteerTypeIds);

  return p;
}

export const MissionService = {
  /**
   * GET /missions
   * Retourne la liste paginée des missions actives.
   * Route publique — pas d'authentification requise.
   */
  getMissions: async (
    query: MissionListQuery = {},
  ): Promise<MissionListResponse> => {
    try {
      const response = await api.get<MissionListResponse>("/missions", {
        params: buildParams(query),
      });
      return response.data;
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Impossible de charger les missions",
        text2: "Vérifiez votre connexion et réessayez.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      throw err;
    }
  },

  /**
   * GET /missions/:id
   * Retourne le détail complet d'une mission.
   * Route publique — pas d'authentification requise.
   */
  getMissionById: async (id: number): Promise<MissionDetail> => {
    try {
      const response = await api.get<MissionDetail>(`/missions/${id}`);
      return response.data;
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Impossible de charger la mission",
        text2: "Vérifiez votre connexion et réessayez.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      throw err;
    }
  },

  /**
   * GET /missions/map
   * Retourne les missions géolocalisées pour la carte.
   * Supporte les mêmes filtres que getMissions.
   * Route publique — pas d'authentification requise.
   */
  getMissionsForMap: async (
    query: MissionListQuery = {},
  ): Promise<MissionMapItem[]> => {
    try {
      const response = await api.get<MissionMapItem[]>("/missions/map", {
        params: buildParams(query),
      });
      return response.data;
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Impossible de charger la carte",
        text2: "Vérifiez votre connexion et réessayez.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      throw err;
    }
  },

  /**
   * GET /associations/missions/:associationId
   * Retourne les missions d'une association, paginées.
   */
  getMissionsByAssociation: async (
    associationId: number,
    query: { page?: number; pageSize?: number } = {},
  ): Promise<MissionListResponse> => {
    try {
      const response = await api.get<MissionListResponse>(
        `/associations/missions/${associationId}`,
        {
          params: {
            page: String(query.page ?? 1),
            pageSize: String(query.pageSize ?? 3),
          },
        },
      );
      return response.data;
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Impossible de charger les missions",
        text2: "Vérifiez votre connexion et réessayez.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      throw err;
    }
  },

  /**
   * GET /reference/causes
   * Retourne la liste des causes disponibles pour les filtres.
   */
  getCauses: async (): Promise<RefItem[]> => {
    try {
      const { data } = await api.get<RefItem[]>("/reference/causes");
      return data;
    } catch {
      return [];
    }
  },

  /**
   * GET /reference/skills
   * Retourne la liste des compétences disponibles pour les filtres.
   */
  getSkills: async (): Promise<RefItem[]> => {
    try {
      const { data } = await api.get<RefItem[]>("/reference/skills");
      return data;
    } catch {
      return [];
    }
  },

  /**
   * GET /reference/public-types
   * Retourne la liste des publics ciblés pour les filtres.
   */
  getPublicTypes: async (): Promise<RefItem[]> => {
    try {
      const { data } = await api.get<RefItem[]>("/reference/public-types");
      return data;
    } catch {
      return [];
    }
  },

  /**
   * GET /reference/volunteer-types
   * Retourne la liste des types de bénévoles pour les filtres.
   */
  getVolunteerTypes: async (): Promise<RefItem[]> => {
    try {
      const { data } = await api.get<RefItem[]>("/reference/volunteer-types");
      return data;
    } catch {
      return [];
    }
  },
};
