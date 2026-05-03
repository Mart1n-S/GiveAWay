import { api } from '@/lib/axios';

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const AssociationsService = {
  pending: async (page = 1, limit = 20) => {
    const { data } = await api.get<PageResult<unknown>>('/admin/associations/pending', { params: { page, limit } });
    return data;
  },
  list: async (params: { search?: string; status?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<PageResult<unknown>>('/admin/associations', { params });
    return data;
  },
  get: async (id: number) => {
    const { data } = await api.get(`/admin/associations/${id}`);
    return data;
  },
  validate: async (id: number) => {
    const { data } = await api.patch(`/admin/associations/${id}/validate`);
    return data;
  },
  reject: async (id: number, reason: string) => {
    const { data } = await api.patch(`/admin/associations/${id}/reject`, { reason });
    return data;
  },
  suspend: async (id: number, reason: string) => {
    const { data } = await api.patch(`/admin/associations/${id}/suspend`, { reason });
    return data;
  },
  reactivate: async (id: number) => {
    const { data } = await api.patch(`/admin/associations/${id}/reactivate`);
    return data;
  },
  requestDocuments: async (id: number, types: string[], message?: string) => {
    const { data } = await api.post(`/admin/associations/${id}/request-documents`, { types, message });
    return data;
  },
  remove: async (id: number, reason?: string) => {
    const { data } = await api.delete(`/admin/associations/${id}`, { data: { reason } });
    return data;
  },
  purge: async (id: number) => {
    const { data } = await api.delete(`/admin/associations/${id}/purge`);
    return data;
  },
  uploadDocument: async (id: number, type: string, file: File) => {
    const fd = new FormData();
    fd.append('type', type);
    fd.append('file', file);
    const { data } = await api.post(`/admin/associations/${id}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  deleteDocumentById: async (documentId: number) => {
    const { data } = await api.delete(`/admin/associations/documents/${documentId}`);
    return data;
  },
  downloadDocument: async (documentId: number) => {
    const res = await api.get<Blob>(`/admin/associations/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    // Récupère le nom du fichier proposé par le backend (Content-Disposition)
    const cd = res.headers['content-disposition'] as string | undefined;
    const match = cd && /filename="?([^"]+)"?/i.exec(cd);
    return { blob: res.data, filename: match?.[1] };
  },
  getMission: async (missionId: number) => {
    const { data } = await api.get(`/admin/associations/missions/${missionId}`);
    return data;
  },
  deleteMission: async (missionId: number, reason?: string) => {
    const { data } = await api.delete(`/admin/associations/missions/${missionId}`, { data: { reason } });
    return data;
  },
};
