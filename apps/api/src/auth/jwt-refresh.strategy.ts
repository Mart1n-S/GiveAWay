import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // On type les cookies pour éviter 'unsafe return'
          const cookies = request?.cookies as
            | Record<string, string>
            | undefined;
          return cookies?.refresh_token || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string; email: string }) {
    const cookies = req.cookies as Record<string, string> | undefined;

    const refreshToken =
      cookies?.refresh_token ||
      req.headers.authorization?.replace('Bearer', '').trim();

    if (!refreshToken)
      throw new ForbiddenException('Refresh token manquant ou invalide');

    return {
      ...payload,
      sub: parseInt(payload.sub, 10),
      refreshToken,
    };
  }
}
