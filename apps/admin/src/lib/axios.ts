import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'x-client-type': 'admin' },
});

let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original) throw error;
    const url = original.url || '';

    if (error.response?.status !== 401 || original._retry) {
      throw error;
    }
    if (url.includes('/admin/auth/login') || url.includes('/admin/auth/refresh')) {
      throw error;
    }

    original._retry = true;

    refreshing ??= api
      .post('/admin/auth/refresh')
      .then(() => undefined)
      .catch((e) => {
        useAuthStore.getState().clear();
        throw e;
      })
      .finally(() => {
        refreshing = null;
      });

    await refreshing;
    return api(original);
  },
);
