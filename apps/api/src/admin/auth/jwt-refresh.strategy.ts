import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface AdminRefreshPayload {
  sub: string;
  email: string;
  scope: 'admin';
}

@Injectable()
export class AdminJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'admin-jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookies = request?.cookies as
            | Record<string, string>
            | undefined;
          return cookies?.admin_refresh_token || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_ADMIN_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: AdminRefreshPayload) {
    if (payload.scope !== 'admin') {
      throw new ForbiddenException('Scope invalide');
    }
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken =
      cookies?.admin_refresh_token ||
      req.headers.authorization?.replace('Bearer', '').trim();

    if (!refreshToken) {
      throw new ForbiddenException('Refresh token admin manquant');
    }

    return {
      sub: Number.parseInt(payload.sub, 10),
      email: payload.email,
      refreshToken,
    };
  }
}
