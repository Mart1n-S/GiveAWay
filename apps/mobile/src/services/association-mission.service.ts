import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { api } from "../lib/axios";
import type {
  AssociationMissionDashboard,
  AssociationMissionItem,
  AssociationMissionStats,
  StatsQueryDto,
  CreateMissionFormValues,
  UpdateMissionFormValues,
  MissionParticipantsResponse,
} from "@repo/shared";

function base(associationId: number) {
  return `/associations/${associationId}/missions`;
}

function extractApiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.message) {
    return String(err.response.data.message);
  }
  return err instanceof Error ? err.message : fallback;
}

function handleDisplayError(err: unknown, fallback: string): never {
  const message = extractApiMessage(err, fallback);
  Toast.show({
    type: "error",
    text1: "Erreur",
    text2: message,
    visibilityTime: 5000,
    onPress: () => Toast.hide(),
  });
  throw new Error(message);
}

// Pour create/update/archive : on remonte l'erreur brute au caller,
// qui gère l'affichage (errors.root + setError par champ).
export const AssociationMissionService = {
  getDashboard: async (
    associationId: number,
  ): Promise<AssociationMissionDashboard> => {
    try {
      const { data } = await api.get<AssociationMissionDashboard>(
        `${base(associationId)}/dashboard`,
      );
      return data;
    } catch (err) {
      return handleDisplayError(err, "Impossible de charger le tableau de bord.");
    }
  },

  getStats: async (
    associationId: number,
    query?: StatsQueryDto,
  ): Promise<AssociationMissionStats> => {
    try {
      const params = new URLSearchParams();
      if (query?.startDate) params.append("startDate", query.startDate);
      if (query?.endDate) params.append("endDate", query.endDate);
      if (query?.missionType) params.append("missionType", query.missionType);
      const qs = params.toString();
      const url = qs
        ? `${base(associationId)}/statistics?${qs}`
        : `${base(associationId)}/statistics`;
      const { data } = await api.get<AssociationMissionStats>(url);
      return data;
    } catch (err) {
      return handleDisplayError(err, "Impossible de charger les statistiques.");
    }
  },

  getOne: async (
    associationId: number,
    missionId: number,
  ): Promise<AssociationMissionItem> => {
    try {
      const { data } = await api.get<AssociationMissionItem>(
        `${base(associationId)}/${missionId}`,
      );
      return data;
    } catch (err) {
      return handleDisplayError(err, "Impossible de charger la mission.");
    }
  },

  create: async (
    associationId: number,
    payload: CreateMissionFormValues,
  ): Promise<AssociationMissionItem> => {
    const { data } = await api.post<AssociationMissionItem>(
      base(associationId),
      payload,
    );
    return data;
  },

  update: async (
    associationId: number,
    missionId: number,
    payload: UpdateMissionFormValues,
  ): Promise<AssociationMissionItem> => {
    const { data } = await api.patch<AssociationMissionItem>(
      `${base(associationId)}/${missionId}`,
      payload,
    );
    return data;
  },

  archive: async (
    associationId: number,
    missionId: number,
  ): Promise<AssociationMissionItem> => {
    try {
      const { data } = await api.patch<AssociationMissionItem>(
        `${base(associationId)}/${missionId}/archive`,
      );
      return data;
    } catch (err) {
      throw new Error(extractApiMessage(err, "Archivage impossible."));
    }
  },

  unarchive: async (
    associationId: number,
    missionId: number,
  ): Promise<AssociationMissionItem> => {
    try {
      const { data } = await api.patch<AssociationMissionItem>(
        `${base(associationId)}/${missionId}/unarchive`,
      );
      return data;
    } catch (err) {
      throw new Error(extractApiMessage(err, "Désarchivage impossible."));
    }
  },

  deleteMission: async (
    associationId: number,
    missionId: number,
  ): Promise<void> => {
    try {
      await api.delete(`${base(associationId)}/${missionId}`);
    } catch (err) {
      throw new Error(extractApiMessage(err, "Suppression impossible."));
    }
  },

  getParticipants: async (
    associationId: number,
    missionId: number,
  ): Promise<MissionParticipantsResponse> => {
    try {
      const { data } = await api.get<MissionParticipantsResponse>(
        `${base(associationId)}/${missionId}/participants`,
      );
      return data;
    } catch (err) {
      return handleDisplayError(err, "Impossible de charger les participants.");
    }
  },

  removeParticipant: async (
    associationId: number,
    missionId: number,
    userId: number,
  ): Promise<void> => {
    try {
      await api.delete(
        `${base(associationId)}/${missionId}/participants/${userId}`,
      );
    } catch (err) {
      throw new Error(extractApiMessage(err, "Impossible de retirer ce participant."));
    }
  },
};
