import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '@repo/shared';

interface AdminJwtPayload {
  sub: string;
  email: string;
  scope: 'admin';
  role: AdminRole;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookies = request?.cookies as
            | Record<string, string>
            | undefined;
          return cookies?.admin_access_token || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ADMIN_ACCESS_SECRET'),
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.scope !== 'admin') {
      throw new UnauthorizedException('Token invalide (scope)');
    }

    const adminId = Number.parseInt(payload.sub, 10);
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, role: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin introuvable');
    }

    return { id: admin.id, email: admin.email, role: admin.role as AdminRole };
  }
}
