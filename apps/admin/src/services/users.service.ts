import { api } from '@/lib/axios';

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  address: {
    street: string;
    postalCode: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
}

export const UsersService = {
  list: async (params: Record<string, unknown>) => {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },
  get: async (id: number) => (await api.get(`/admin/users/${id}`)).data,
  create: async (dto: CreateUserPayload) => (await api.post('/admin/users', dto)).data,
  update: async (id: number, dto: Record<string, unknown>) =>
    (await api.patch(`/admin/users/${id}`, dto)).data,
  setStatus: async (id: number, status: 'ACTIVE' | 'SUSPENDED', reason?: string) =>
    (await api.patch(`/admin/users/${id}/status`, { status, reason })).data,
  remove: async (id: number) => (await api.delete(`/admin/users/${id}`)).data,
};
