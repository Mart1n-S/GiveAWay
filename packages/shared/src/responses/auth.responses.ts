import { User } from "../user/user.dto";

export interface AuthResponse {
  message: string;
  user: User;
  backendTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
