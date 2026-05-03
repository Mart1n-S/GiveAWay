import { api } from '@/lib/axios';
import type { DashboardOverview, TimeseriesPoint } from '@repo/shared';

export const StatsService = {
  overview: async (from?: string, to?: string) => {
    const { data } = await api.get<DashboardOverview>('/admin/stats/overview', { params: { from, to } });
    return data;
  },
  timeseries: async (params: { metric: string; granularity?: 'day' | 'week' | 'month'; from?: string; to?: string }) => {
    const { data } = await api.get<TimeseriesPoint[]>('/admin/stats/timeseries', { params });
    return data;
  },
  breakdown: async (params: { dimension: string; limit?: number; from?: string; to?: string }) => {
    const { data } = await api.get('/admin/stats/breakdown', { params });
    return data;
  },
  top: async (params: { entity: string; limit?: number; from?: string; to?: string }) => {
    const { data } = await api.get('/admin/stats/top', { params });
    return data;
  },
  adminLogs: async (params: Record<string, unknown>) => {
    const { data } = await api.get('/admin/stats/admin-logs', { params });
    return data;
  },
  exportAdminLogs: async (params: Record<string, unknown>) => {
    const { data } = await api.get<Blob>('/admin/stats/export/admin-logs.csv', {
      params,
      responseType: 'blob',
    });
    return data;
  },
};
