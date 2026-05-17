import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ConversationListItemDto,
  CreateConversationDto,
  MessageDto,
  UnreadCountDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingEvents } from './messaging.events';
import {
  AssociationRole,
  AssociationStatus,
  Prisma,
  UserStatus,
} from '../generated/prisma/client';

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: {
    association: { select: { id: true; name: true; logoUrl: true } };
    volunteer: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        profilePicture: true;
      };
    };
    associationMember: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        profilePicture: true;
      };
    };
  };
}>;

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: MessagingEvents,
  ) {}

  /**
   * Identifie les conversations correspondant au filtre, notifie les
   * participants (sauf `excludedUserId`) via WS qu'elles sont supprimées,
   * puis effectue la suppression en BDD dans la même transaction.
   *
   * À utiliser avant toute opération qui ferait disparaître des conv
   * par cascade Prisma (suppression de user, d'asso, départ d'un membre).
   *
   * Si Prisma fait déjà la cascade en aval, on peut omettre la suppression
   * Prisma ici (passer `skipDelete: true`) et n'effectuer que la notif.
   */
  async deleteConversationsAndNotify(args: {
    where: Prisma.ConversationWhereInput;
    reason: 'user_deleted' | 'member_left' | 'association_deleted';
    excludedUserId?: number;
    /** Si true, on ne supprime pas en BDD (Prisma fera la cascade). */
    skipDelete?: boolean;
    /** Optionnel : transaction client pour participer à une tx existante. */
    tx?: Prisma.TransactionClient;
  }): Promise<{ deletedCount: number; notifiedUserIds: number[] }> {
    const client = args.tx ?? this.prisma;
    const convs = await client.conversation.findMany({
      where: args.where,
      select: { id: true, volunteerId: true, associationMemberId: true },
    });
    if (convs.length === 0) {
      return { deletedCount: 0, notifiedUserIds: [] };
    }

    // 1. Notifier WS (avant suppression — les rooms WS sont basées sur l'userId,
    //    pas sur la conv, donc on peut le faire avant ou après la BDD)
    const notifiedUserIds = new Set<number>();
    for (const conv of convs) {
      for (const userId of [conv.volunteerId, conv.associationMemberId]) {
        if (userId === args.excludedUserId) continue;
        this.events.broadcastConversationDeleted(userId, conv.id, args.reason);
        notifiedUserIds.add(userId);
      }
    }

    // 2. Suppression BDD (sauf si la cascade Prisma s'en occupera)
    let deletedCount = 0;
    if (!args.skipDelete) {
      const res = await client.conversation.deleteMany({ where: args.where });
      deletedCount = res.count;
    }

    // 3. Resynchroniser le compteur non-lus côté chaque user notifié.
    //    On exclut explicitement les conv qu'on vient d'annoncer comme
    //    supprimées : utile en mode skipDelete=true où la cascade Prisma
    //    n'a pas encore eu lieu au moment où on calcule le count (sinon
    //    le compteur restitué inclurait encore les conv condamnées).
    const convIdsBeingDeleted = convs.map((c) => c.id);
    for (const userId of notifiedUserIds) {
      try {
        const count = await client.conversation.count({
          where: {
            id: { notIn: convIdsBeingDeleted },
            OR: [{ volunteerId: userId }, { associationMemberId: userId }],
            messages: {
              some: { readAt: null, NOT: { senderId: userId } },
            },
          },
        });
        this.events.sendUnreadCount(userId, count);
      } catch {
        /* non bloquant */
      }
    }

    return { deletedCount, notifiedUserIds: Array.from(notifiedUserIds) };
  }

  // -----------------------------------------------------------------
  // Vérifie que l'utilisateur a accès à cette conversation
  // -----------------------------------------------------------------
  async assertOwnership(
    conversationId: number,
    userId: number,
  ): Promise<{
    id: number;
    volunteerId: number;
    associationMemberId: number;
    associationId: number;
    volunteerDeletedAt: Date | null;
    associationMemberDeletedAt: Date | null;
  }> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ volunteerId: userId }, { associationMemberId: userId }],
      },
      select: {
        id: true,
        volunteerId: true,
        associationMemberId: true,
        associationId: true,
        volunteerDeletedAt: true,
        associationMemberDeletedAt: true,
      },
    });
    if (!conv) {
      throw new ForbiddenException('Conversation introuvable ou accès refusé');
    }
    return conv;
  }

  // -----------------------------------------------------------------
  // Renvoie la date de soft-delete pour le user courant, ou null
  // -----------------------------------------------------------------
  getDeletedAtForUser(
    conv: {
      volunteerId: number;
      volunteerDeletedAt: Date | null;
      associationMemberDeletedAt: Date | null;
    },
    userId: number,
  ): Date | null {
    return conv.volunteerId === userId
      ? conv.volunteerDeletedAt
      : conv.associationMemberDeletedAt;
  }

  // -----------------------------------------------------------------
  // DELETE /conversations/:id — soft-delete pour le user appelant.
  // L'autre participant n'est pas notifié et continue de voir la conv.
  // Si un nouveau message arrive ultérieurement, la conv réapparaîtra
  // automatiquement côté user (filtre lastMessageAt > deletedAt), mais
  // les messages antérieurs resteront masqués.
  // -----------------------------------------------------------------
  async softDeleteForUser(
    userId: number,
    conversationId: number,
  ): Promise<void> {
    const conv = await this.assertOwnership(conversationId, userId);
    const isVolunteer = conv.volunteerId === userId;
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: isVolunteer
        ? { volunteerDeletedAt: new Date() }
        : { associationMemberDeletedAt: new Date() },
    });

    // Le compteur global non-lus côté user peut avoir changé : on le
    // resynchronise et on pousse via WS pour rafraîchir la pastille tab.
    const { count } = await this.getUnreadCount(userId);
    this.events.sendUnreadCount(userId, count);
  }

  // -----------------------------------------------------------------
  // Retourne l'ID du destinataire (l'autre participant)
  // -----------------------------------------------------------------
  getRecipientId(
    conv: { volunteerId: number; associationMemberId: number },
    senderId: number,
  ): number {
    return conv.volunteerId === senderId
      ? conv.associationMemberId
      : conv.volunteerId;
  }

  // -----------------------------------------------------------------
  // POST /conversations
  // -----------------------------------------------------------------
  async createConversation(
    requesterId: number,
    dto: CreateConversationDto,
  ): Promise<{
    conversation: ConversationListItemDto;
    firstMessage: MessageDto | null;
  }> {
    if (dto.recipientId === requesterId) {
      throw new BadRequestException(
        'Vous ne pouvez pas démarrer une conversation avec vous-même',
      );
    }

    // 1. Vérifier l'association : doit être VALIDATED
    const association = await this.prisma.association.findUnique({
      where: { id: dto.associationId },
      select: { id: true, status: true, name: true },
    });
    if (!association) {
      throw new NotFoundException('Association introuvable');
    }
    if (association.status !== AssociationStatus.VALIDATED) {
      throw new ForbiddenException(
        "Cette association n'accepte pas encore les messages",
      );
    }

    // 2. Vérifier le destinataire : doit exister et être ACTIF
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true, status: true },
    });
    if (!recipient) {
      throw new NotFoundException('Destinataire introuvable');
    }
    if (recipient.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        "Le destinataire n'est pas disponible pour discuter",
      );
    }

    // 3. Identifier qui est membre — un et un seul des deux doit l'être
    const memberships = await this.prisma.associationUser.findMany({
      where: {
        associationId: dto.associationId,
        userId: { in: [requesterId, dto.recipientId] },
      },
      select: { userId: true },
    });
    const memberIds = new Set(memberships.map((m) => m.userId));

    const requesterIsMember = memberIds.has(requesterId);
    const recipientIsMember = memberIds.has(dto.recipientId);

    if (requesterIsMember && recipientIsMember) {
      throw new ForbiddenException(
        "Deux membres d'une même association ne peuvent pas se contacter via la messagerie bénévole",
      );
    }
    if (!requesterIsMember && !recipientIsMember) {
      throw new ForbiddenException(
        "Au moins un des deux participants doit être membre de l'association",
      );
    }

    // 4. Calculer le triplet ordonné
    const volunteerId = requesterIsMember ? dto.recipientId : requesterId;
    const associationMemberId = requesterIsMember
      ? requesterId
      : dto.recipientId;

    // 5. Upsert atomique de la conversation
    const initialContent = dto.initialMessage?.trim();
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.upsert({
        where: {
          unique_conversation_per_triple: {
            volunteerId,
            associationMemberId,
            associationId: dto.associationId,
          },
        },
        create: {
          volunteerId,
          associationMemberId,
          associationId: dto.associationId,
        },
        update: {},
        include: {
          association: { select: { id: true, name: true, logoUrl: true } },
          volunteer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
          associationMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
      });

      let firstMessage: MessageDto | null = null;
      if (initialContent) {
        const created = await tx.message.create({
          data: {
            conversationId: conv.id,
            senderId: requesterId,
            content: initialContent,
          },
        });
        await tx.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: now },
        });
        conv.lastMessageAt = now;
        firstMessage = this.toMessageDto(created);
      }

      return { conv, firstMessage };
    });

    const listItem = this.toListItem(result.conv, requesterId, 0);
    return { conversation: listItem, firstMessage: result.firstMessage };
  }

  // -----------------------------------------------------------------
  // Trouve le contact principal d'une association (OWNER, sinon premier ADMIN actif)
  // -----------------------------------------------------------------
  async findPrimaryContactUserId(associationId: number): Promise<number> {
    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      select: { id: true, status: true },
    });
    if (!association) {
      throw new NotFoundException('Association introuvable');
    }
    if (association.status !== AssociationStatus.VALIDATED) {
      throw new ForbiddenException(
        "Cette association n'accepte pas encore les messages",
      );
    }

    const members = await this.prisma.associationUser.findMany({
      where: {
        associationId,
        user: { status: UserStatus.ACTIVE },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: { userId: true, role: true },
    });

    const owner = members.find((m) => m.role === AssociationRole.OWNER);
    if (owner) return owner.userId;

    const admin = members.find((m) => m.role === AssociationRole.ADMIN);
    if (admin) return admin.userId;

    const editor = members.find((m) => m.role === AssociationRole.EDITOR);
    if (editor) return editor.userId;

    throw new NotFoundException(
      'Aucun membre actif disponible pour cette association',
    );
  }

  // -----------------------------------------------------------------
  // GET /conversations
  // -----------------------------------------------------------------
  async listConversations(userId: number): Promise<ConversationListItemDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ volunteerId: userId }, { associationMemberId: userId }],
        // N'inclut pas les conv sans message : un clic "Contacter" qui ne
        // donne pas lieu à un envoi ne doit pas polluer la liste.
        messages: { some: {} },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        association: { select: { id: true, name: true, logoUrl: true } },
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        associationMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    });

    // Soft-delete : filtre les conv masquées pour le user (deletedAt défini
    // sans activité postérieure). Prisma ne supportant pas les comparaisons
    // croisées de colonnes, on filtre en JS après fetch.
    const visible = conversations.filter((conv) => {
      const deletedAt = this.getDeletedAtForUser(conv, userId);
      if (!deletedAt) return true;
      return conv.lastMessageAt !== null && conv.lastMessageAt > deletedAt;
    });

    // Pour chaque conv visible : récupère le dernier message + le compteur
    // non-lus, en respectant le filtre `createdAt > deletedAt` côté user.
    // Le nombre de conv par utilisateur est borné, donc le N+1 est
    // acceptable ici (et reste cache-friendly côté Postgres).
    const enriched = await Promise.all(
      visible.map(async (conv) => {
        const deletedAt = this.getDeletedAtForUser(conv, userId);
        const dateFilter = deletedAt ? { createdAt: { gt: deletedAt } } : {};

        const [lastMessage, unreadCount] = await Promise.all([
          this.prisma.message.findFirst({
            where: { conversationId: conv.id, ...dateFilter },
            orderBy: { id: 'desc' },
            select: {
              id: true,
              content: true,
              senderId: true,
              createdAt: true,
            },
          }),
          this.prisma.message.count({
            where: {
              conversationId: conv.id,
              readAt: null,
              NOT: { senderId: userId },
              ...dateFilter,
            },
          }),
        ]);

        return { conv, lastMessage, unreadCount };
      }),
    );

    return enriched.map(({ conv, lastMessage, unreadCount }) => {
      const item = this.toListItem(conv, userId, unreadCount);
      if (lastMessage) {
        item.lastMessage = {
          id: lastMessage.id,
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt.toISOString(),
        };
      }
      return item;
    });
  }

  // -----------------------------------------------------------------
  // GET /conversations/unread-count
  // -----------------------------------------------------------------
  async getUnreadCount(userId: number): Promise<UnreadCountDto> {
    // On ne peut pas se contenter d'un count Prisma : il faut filtrer
    // les messages selon `createdAt > <user>DeletedAt`. On récupère les
    // metadonnées minimales puis on agrège côté JS.
    const convs = await this.prisma.conversation.findMany({
      where: { OR: [{ volunteerId: userId }, { associationMemberId: userId }] },
      select: {
        id: true,
        volunteerId: true,
        volunteerDeletedAt: true,
        associationMemberDeletedAt: true,
        lastMessageAt: true,
      },
    });

    const visible = convs.filter((conv) => {
      const deletedAt = this.getDeletedAtForUser(conv, userId);
      if (!deletedAt) return true;
      return conv.lastMessageAt !== null && conv.lastMessageAt > deletedAt;
    });

    const flags = await Promise.all(
      visible.map(async (conv) => {
        const deletedAt = this.getDeletedAtForUser(conv, userId);
        const count = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            readAt: null,
            NOT: { senderId: userId },
            ...(deletedAt ? { createdAt: { gt: deletedAt } } : {}),
          },
        });
        return count > 0;
      }),
    );

    return { count: flags.filter(Boolean).length };
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------
  toMessageDto(msg: {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    readAt: Date | null;
  }): MessageDto {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt ? msg.readAt.toISOString() : null,
    };
  }

  toListItem(
    conv: ConversationWithRelations,
    currentUserId: number,
    unreadCount: number,
  ): ConversationListItemDto {
    const isVolunteer = conv.volunteerId === currentUserId;
    const other = isVolunteer ? conv.associationMember : conv.volunteer;
    return {
      id: conv.id,
      association: {
        id: conv.association.id,
        name: conv.association.name,
        logoUrl: conv.association.logoUrl,
      },
      otherUser: {
        id: other.id,
        firstName: other.firstName,
        lastName: other.lastName,
        profilePicture: other.profilePicture,
      },
      currentUserSide: isVolunteer ? 'volunteer' : 'associationMember',
      lastMessage: null,
      unreadCount,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: (conv.lastMessageAt ?? conv.createdAt).toISOString(),
    };
  }
}
