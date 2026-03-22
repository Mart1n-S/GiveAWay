/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AuthResponse, User } from '@repo/shared';

export function buildAuthResponse(
  clientType: string | undefined,
  user: User,
  accessToken: string,
  refreshToken: string,
  message: string,
): AuthResponse {
  if (clientType === 'mobile') {
    return {
      message,
      user,
      backendTokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 * 1000,
      },
    };
  }
  return { message, user };
}
