import { api } from '@/lib/axios';
import type { AdminAuthResponse, AdminLoginDto, AdminResponse } from '@repo/shared';

export async function login(dto: AdminLoginDto): Promise<AdminAuthResponse> {
  const { data } = await api.post<AdminAuthResponse>('/admin/auth/login', dto);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/admin/auth/logout', {});
}

export async function me(): Promise<AdminResponse> {
  const { data } = await api.get<{ admin: AdminResponse }>('/admin/auth/me');
  return data.admin;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api.post('/admin/auth/change-password', { currentPassword, newPassword });
}
