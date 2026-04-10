import { api } from "../lib/axios";
import {
  MissionDetail,
  MissionListResponse,
  MissionListQuery,
  MissionMapItem,
} from "@repo/shared";

export const MissionService = {
  /**
   * GET /missions
   * Retourne la liste paginée des missions actives.
   * Route publique — pas d'authentification requise.
   */
  getMissions: async (
    query: MissionListQuery = {},
  ): Promise<MissionListResponse> => {
    const params: Record<string, string> = {};

    if (query.page) params.page = String(query.page);
    if (query.pageSize) params.pageSize = String(query.pageSize);
    if (query.type) params.type = query.type;
    if (query.causeId) params.causeId = String(query.causeId);
    if (query.city) params.city = query.city;
    if (query.search) params.search = query.search;

    const response = await api.get<MissionListResponse>("/missions", {
      params,
    });
    return response.data;
  },

  /**
   * GET /missions/:id
   * Retourne le détail complet d'une mission.
   * Route publique — pas d'authentification requise.
   */
  getMissionById: async (id: number): Promise<MissionDetail> => {
    const response = await api.get<MissionDetail>(`/missions/${id}`);
    return response.data;
  },

  /**
   * GET /missions/map
   * Retourne les missions géolocalisées pour affichage sur la carte.
   * Route publique — pas d'authentification requise.
   */
  getMissionsForMap: async (): Promise<MissionMapItem[]> => {
    const response = await api.get<MissionMapItem[]>("/missions/map");
    return response.data;
  },
};
