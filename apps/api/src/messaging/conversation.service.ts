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
      },
    });
    if (!conv) {
      throw new ForbiddenException('Conversation introuvable ou accès refusé');
    }
    return conv;
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
        messages: {
          orderBy: { id: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                readAt: null,
                NOT: { senderId: userId },
              },
            },
          },
        },
      },
    });

    return conversations.map((conv) => {
      const unreadCount = conv._count.messages;
      const item = this.toListItem(conv, userId, unreadCount);
      const last = conv.messages[0];
      if (last) {
        item.lastMessage = {
          id: last.id,
          content: last.content,
          senderId: last.senderId,
          createdAt: last.createdAt.toISOString(),
        };
      }
      return item;
    });
  }

  // -----------------------------------------------------------------
  // GET /conversations/unread-count
  // -----------------------------------------------------------------
  async getUnreadCount(userId: number): Promise<UnreadCountDto> {
    const count = await this.prisma.conversation.count({
      where: {
        OR: [{ volunteerId: userId }, { associationMemberId: userId }],
        messages: {
          some: {
            readAt: null,
            NOT: { senderId: userId },
          },
        },
      },
    });
    return { count };
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
