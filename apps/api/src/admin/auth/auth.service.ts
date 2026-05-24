import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { hash, verify } from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminAuthResponse,
  AdminLoginDto,
  AdminResponse,
  AdminRole as SharedAdminRole,
} from '@repo/shared';
import { Admin as PrismaAdmin } from '../../generated/prisma/client';

@Injectable()
export class AdminAuthService {
  readonly logger = new Logger(AdminAuthService.name);

  constructor(
    readonly prisma: PrismaService,
    readonly jwtService: JwtService,
    readonly config: ConfigService,
  ) {}

  mapAdminToResponse(admin: PrismaAdmin): AdminResponse {
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role as unknown as SharedAdminRole,
      mustChangePassword: admin.mustChangePassword,
      lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
      createdAt: admin.createdAt.toISOString(),
    };
  }

  async generateTokens(admin: PrismaAdmin) {
    const accessSecret = this.config.getOrThrow<string>(
      'JWT_ADMIN_ACCESS_SECRET',
    );
    const refreshSecret = this.config.getOrThrow<string>(
      'JWT_ADMIN_REFRESH_SECRET',
    );
    const accessExpires = (this.config.get<string>(
      'JWT_ADMIN_ACCESS_EXPIRES_IN',
    ) || '15m') as SignOptions['expiresIn'];
    const refreshExpires = (this.config.get<string>(
      'JWT_ADMIN_REFRESH_EXPIRES_IN',
    ) || '7d') as SignOptions['expiresIn'];

    const basePayload = {
      sub: admin.id.toString(),
      email: admin.email,
      scope: 'admin' as const,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, role: admin.role },
        { secret: accessSecret, expiresIn: accessExpires },
      ),
      this.jwtService.signAsync(basePayload, {
        secret: refreshSecret,
        expiresIn: refreshExpires,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(
    adminId: number,
    token: string,
    userAgent: string,
    ip: string,
  ) {
    const hashedToken = await hash(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.adminRefreshToken.create({
      data: { adminId, hashedToken, expiresAt, userAgent, ip },
    });
  }

  async login(
    dto: AdminLoginDto,
    userAgent: string,
    ip: string,
  ): Promise<{
    admin: PrismaAdmin;
    accessToken: string;
    refreshToken: string;
  }> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isMatch = await verify(admin.password, dto.password);
    if (!isMatch) {
      this.logger.warn(`Tentative login admin échouée pour : ${dto.email}`);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(admin);
    await this.saveRefreshToken(admin.id, tokens.refreshToken, userAgent, ip);

    const updated = await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return { admin: updated, ...tokens };
  }

  async logout(adminId: number, refreshToken: string) {
    const tokens = await this.prisma.adminRefreshToken.findMany({
      where: { adminId },
    });

    for (const t of tokens) {
      try {
        if (await verify(t.hashedToken, refreshToken)) {
          await this.prisma.adminRefreshToken.delete({ where: { id: t.id } });
          break;
        }
      } catch {
        // ignore
      }
    }
  }

  async refresh(
    adminId: number,
    refreshToken: string,
    userAgent: string,
    ip: string,
  ) {
    const stored = await this.prisma.adminRefreshToken.findMany({
      where: { adminId, expiresAt: { gt: new Date() } },
    });

    let matched: { id: string } | null = null;
    for (const t of stored) {
      try {
        if (await verify(t.hashedToken, refreshToken)) {
          matched = { id: t.id };
          break;
        }
      } catch {
        // ignore
      }
    }

    if (!matched) {
      throw new ForbiddenException('Refresh token invalide ou expiré');
    }

    const admin = await this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
    });

    const tokens = await this.generateTokens(admin);
    await this.prisma.adminRefreshToken.delete({ where: { id: matched.id } });
    await this.saveRefreshToken(admin.id, tokens.refreshToken, userAgent, ip);

    return tokens;
  }

  buildAuthResponse(
    clientType: string | undefined,
    admin: PrismaAdmin | undefined,
    accessToken: string,
    refreshToken: string,
    message: string,
  ): AdminAuthResponse {
    if (clientType === 'mobile' || clientType === 'admin-native') {
      return {
        message,
        admin: admin ? this.mapAdminToResponse(admin) : undefined,
        backendTokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60 * 1000,
        },
      };
    }
    return {
      message,
      admin: admin ? this.mapAdminToResponse(admin) : undefined,
    };
  }

  async changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const admin = await this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
    });
    const ok = await verify(admin.password, currentPassword);
    if (!ok) {
      // 400 (et pas 401) : la requête est bien authentifiée, c'est l'input
      // métier qui est invalide. Renvoyer 401 ferait croire à l'intercepteur
      // Axios admin qu'il faut rafraîchir le token, masquant le vrai message.
      throw new BadRequestException({
        message: 'Mot de passe actuel incorrect',
        errors: {
          properties: {
            currentPassword: { errors: ['Mot de passe actuel incorrect'] },
          },
        },
      });
    }
    const hashed = await hash(newPassword);
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashed, mustChangePassword: false },
    });
  }
}
