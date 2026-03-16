import { AuthResponse } from '@repo/shared';

export function buildAuthResponse(
  clientType: string | undefined,
  user: any,
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
