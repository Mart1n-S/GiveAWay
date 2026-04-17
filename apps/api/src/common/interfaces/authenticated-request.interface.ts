import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    // --- Champs communs ---
    email: string;

    // --- Cas 1 : JwtStrategy (Access Token / Prisma User) ---
    // Utilisé par /me, /logout
    id?: number;
    firstName?: string;
    lastName?: string;
    status?: string;

    // --- Cas 2 : JwtRefreshStrategy (Refresh Token) ---
    // Utilisé par /refresh
    sub?: number; // Dans le standard JWT, l'ID s'appelle souvent 'sub'
    refreshToken?: string;
  };

  // Les cookies (toujours là grâce à cookie-parser)
  cookies: { [key: string]: string };
}
