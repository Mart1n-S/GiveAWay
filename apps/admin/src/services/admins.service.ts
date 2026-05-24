import { api } from '@/lib/axios';
import type { CreateAdminDto, UpdateAdminDto } from '@repo/shared';

export const AdminsService = {
  list: async () => (await api.get('/admin/admins')).data,
  get: async (id: number) => (await api.get(`/admin/admins/${id}`)).data,
  create: async (dto: CreateAdminDto) => (await api.post('/admin/admins', dto)).data,
  update: async (id: number, dto: UpdateAdminDto) =>
    (await api.patch(`/admin/admins/${id}`, dto)).data,
  resetPassword: async (id: number) =>
    (await api.post(`/admin/admins/${id}/reset-password`)).data,
  remove: async (id: number) => (await api.delete(`/admin/admins/${id}`)).data,
};
