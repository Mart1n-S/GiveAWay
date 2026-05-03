import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { AdminRole as PrismaAdminRole } from '../../generated/prisma/client';
import { AdminRole } from '@repo/shared';

@Injectable()
export class AdminManagementService {
  private readonly logger = new Logger(AdminManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private genTempPassword(): string {
    return (
      randomBytes(12).toString('base64').replaceAll(/[+/=]/g, '') + 'A1!'
    ).slice(0, 16);
  }

  async list() {
    return this.prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
  }

  async getById(id: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
        mustChangePassword: true,
        createdAt: true,
        logs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!admin) throw new NotFoundException('Admin introuvable');
    return admin;
  }

  async create(dto: {
    email: string;
    firstName: string;
    lastName: string;
    role: AdminRole;
  }) {
    const existing = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const tempPassword = this.genTempPassword();
    const hashed = await hash(tempPassword);
    const created = await this.prisma.admin.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as unknown as PrismaAdminRole,
        password: hashed,
        mustChangePassword: true,
      },
    });

    const loginUrl =
      this.config.get<string>('ADMIN_LOGIN_URL') ||
      'https://admin.giveaway.fr/login';
    this.mail
      .sendAdminInvitationEmail(
        created.email,
        created.firstName,
        tempPassword,
        loginUrl,
      )
      .catch((e) => this.logger.warn(`mail failed: ${String(e)}`));

    return created;
  }

  async update(
    currentAdminId: number,
    id: number,
    dto: Partial<{
      email: string;
      firstName: string;
      lastName: string;
      role: AdminRole;
    }>,
  ) {
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Admin introuvable');

    // Auto-protection : pas de rétrogradation de soi-même
    if (
      currentAdminId === id &&
      dto.role &&
      dto.role !== AdminRole.SUPER_ADMIN &&
      target.role === PrismaAdminRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez pas rétrograder votre propre rôle',
      );
    }

    // Dernier super admin
    if (
      target.role === PrismaAdminRole.SUPER_ADMIN &&
      dto.role &&
      dto.role !== AdminRole.SUPER_ADMIN
    ) {
      const count = await this.prisma.admin.count({
        where: { role: PrismaAdminRole.SUPER_ADMIN },
      });
      if (count <= 1) {
        throw new ForbiddenException(
          'Impossible de rétrograder le dernier SUPER_ADMIN',
        );
      }
    }

    if (dto.email) {
      const conflict = await this.prisma.admin.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Email déjà utilisé');
    }

    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email;
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.role) data.role = dto.role as unknown as PrismaAdminRole;

    return this.prisma.admin.update({ where: { id }, data });
  }

  async resetPassword(id: number) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin introuvable');

    const tempPassword = this.genTempPassword();
    const hashed = await hash(tempPassword);
    await this.prisma.admin.update({
      where: { id },
      data: { password: hashed, mustChangePassword: true },
    });
    // Invalide tous les refresh tokens
    await this.prisma.adminRefreshToken.deleteMany({ where: { adminId: id } });

    this.mail
      .sendAdminPasswordResetEmail(admin.email, admin.firstName, tempPassword)
      .catch((e) => this.logger.warn(`mail failed: ${String(e)}`));
    return { sent: true };
  }

  async delete(currentAdminId: number, id: number) {
    if (currentAdminId === id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas vous supprimer vous-même',
      );
    }
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Admin introuvable');

    if (target.role === PrismaAdminRole.SUPER_ADMIN) {
      const count = await this.prisma.admin.count({
        where: { role: PrismaAdminRole.SUPER_ADMIN },
      });
      if (count <= 1) {
        throw new ForbiddenException(
          'Impossible de supprimer le dernier SUPER_ADMIN',
        );
      }
    }

    await this.prisma.admin.delete({ where: { id } });
    return { deleted: true };
  }
}
