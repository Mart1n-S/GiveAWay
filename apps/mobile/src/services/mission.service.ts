import { api } from "../lib/axios";
import { MissionListResponse, MissionListQuery } from "@repo/shared";

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
};
