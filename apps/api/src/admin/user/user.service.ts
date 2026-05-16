import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ConversationService } from '../../messaging/conversation.service';
import { UserStatus } from '../../generated/prisma/client';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly conversationService: ConversationService,
  ) {}

  private genTempPassword(): string {
    // Mot de passe temporaire respectant PASSWORD_REGEX (maj/min/chiffre/spécial)
    // et MIN 12 chars (cf. RegisterDto). On ajoute un suffixe garantissant la classe de chars.
    const base = randomBytes(12).toString('base64').replaceAll(/[+/=]/g, '');
    return (base + 'Aa1!').slice(0, 16);
  }

  async list(query: {
    search?: string;
    status?: UserStatus;
    page: number;
    limit: number;
    sortBy: 'createdAt' | 'email' | 'lastName';
    sortDir: 'asc' | 'desc';
  }) {
    const skip = (query.page - 1) * query.limit;
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortDir },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          emailVerifiedAt: true,
          age: true,
          profilePicture: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        address: true,
        associations: { include: { association: true } },
        skills: { include: { skill: true } },
        causes: { include: { cause: true } },
        availability: true,
        participations: {
          include: { mission: { include: { association: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: {
    email: string;
    firstName: string;
    lastName: string;
    age: number;
    address: {
      street: string;
      postalCode: string;
      city: string;
      latitude?: number;
      longitude?: number;
    };
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email déjà utilisé');
    const tempPassword = this.genTempPassword();
    const hashed = await hash(tempPassword);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        age: dto.age,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        address: {
          create: {
            street: dto.address.street,
            postalCode: dto.address.postalCode,
            city: dto.address.city,
            latitude: dto.address.latitude,
            longitude: dto.address.longitude,
          },
        },
      },
    });
    this.mail
      .sendUserCreatedByAdminEmail(user.email, user.firstName, tempPassword)
      .catch((e) => this.logger.warn(`mail failed: ${String(e)}`));
    return user;
  }

  async update(id: number, dto: Record<string, unknown>) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    // L'admin ne peut modérer que le contenu textuel (nom, prénom, biographie)
    const cleanData: Record<string, unknown> = {};
    for (const k of ['firstName', 'lastName', 'biography']) {
      if (dto[k] !== undefined) cleanData[k] = dto[k];
    }
    return this.prisma.user.update({ where: { id }, data: cleanData });
  }

  async setStatus(id: number, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException(
        'Impossible de modifier un compte supprimé',
      );
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: status as UserStatus },
    });
  }

  async resetPassword(id: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const tempPassword = this.genTempPassword();
    const hashed = await hash(tempPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    this.mail
      .sendPasswordResetEmail(user.email, tempPassword)
      .catch((e) => this.logger.warn(`mail failed: ${String(e)}`));
    return { sent: true };
  }

  async softDelete(id: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException('Compte déjà supprimé');
    }
    const anonymousEmail = `deleted-${id}@anon.local`;

    // 1. Notifier WS les autres participants des conversations supprimées
    await this.conversationService.deleteConversationsAndNotify({
      where: {
        OR: [{ volunteerId: id }, { associationMemberId: id }],
      },
      reason: 'user_deleted',
      excludedUserId: id,
    });

    // 2. Anonymisation + nettoyage des relations
    await this.prisma.$transaction([
      this.prisma.userSkill.deleteMany({ where: { userId: id } }),
      this.prisma.userCause.deleteMany({ where: { userId: id } }),
      this.prisma.userAvailability.deleteMany({ where: { userId: id } }),
      this.prisma.userAssociationFollow.deleteMany({ where: { userId: id } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.token.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: {
          email: anonymousEmail,
          firstName: 'Utilisateur',
          lastName: 'supprimé',
          password: null,
          googleId: null,
          age: null,
          biography: null,
          profilePicture: null,
          status: UserStatus.DELETED,
          emailVerifiedAt: null,
          emailNotifications: false,
          matchNotifications: false,
          pushToken: null,
          addressId: null,
          deletedAt: new Date(),
        },
      }),
    ]);

    return { deleted: true };
  }
}
