import { AdminRole } from "./admin.enums";

export interface AdminResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminAuthResponse {
  message: string;
  admin?: AdminResponse;
  backendTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
