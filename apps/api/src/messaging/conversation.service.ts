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

/**
 * Une conversation est strictement 1-1 entre deux utilisateurs, classés
 * dans un ordre canonique (user1Id < user2Id) pour garantir l'unicité
 * indépendamment de qui a initié et via quelle association.
 */
type ConversationWithUsers = Prisma.ConversationGetPayload<{
  include: {
    user1: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        profilePicture: true;
      };
    };
    user2: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        profilePicture: true;
      };
    };
  };
}>;

/** Association "primaire" d'un utilisateur (la première à laquelle il a
 *  adhéré). `null` si l'utilisateur n'est membre d'aucune asso. */
type PrimaryAssociation = {
  id: number;
  name: string;
  logoUrl: string | null;
} | null;

function canonicalPair(
  a: number,
  b: number,
): { user1Id: number; user2Id: number } {
  return a < b ? { user1Id: a, user2Id: b } : { user1Id: b, user2Id: a };
}

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
      select: { id: true, user1Id: true, user2Id: true },
    });
    if (convs.length === 0) {
      return { deletedCount: 0, notifiedUserIds: [] };
    }

    // 1. Notifier WS (avant suppression — les rooms WS sont basées sur l'userId,
    //    pas sur la conv, donc on peut le faire avant ou après la BDD)
    const notifiedUserIds = new Set<number>();
    for (const conv of convs) {
      for (const userId of [conv.user1Id, conv.user2Id]) {
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
            OR: [{ user1Id: userId }, { user2Id: userId }],
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
    user1Id: number;
    user2Id: number;
    user1DeletedAt: Date | null;
    user2DeletedAt: Date | null;
  }> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
        user1DeletedAt: true,
        user2DeletedAt: true,
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
      user1Id: number;
      user1DeletedAt: Date | null;
      user2DeletedAt: Date | null;
    },
    userId: number,
  ): Date | null {
    return conv.user1Id === userId ? conv.user1DeletedAt : conv.user2DeletedAt;
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
    const isUser1 = conv.user1Id === userId;
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: isUser1
        ? { user1DeletedAt: new Date() }
        : { user2DeletedAt: new Date() },
    });

    // Le compteur global non-lus côté user peut avoir changé : on le
    // resynchronise et on pousse via WS pour rafraîchir la pastille tab.
    const { count } = await this.getUnreadCount(userId);
    this.events.sendUnreadCount(userId, count);
  }

  // -----------------------------------------------------------------
  // Retourne l'ID du destinataire (l'autre participant)
  // -----------------------------------------------------------------
  getOtherUserId(
    conv: { user1Id: number; user2Id: number },
    senderId: number,
  ): number {
    return conv.user1Id === senderId ? conv.user2Id : conv.user1Id;
  }

  // -----------------------------------------------------------------
  // Compteur de messages non-lus pour UNE conversation, du point de
  // vue d'un user donné. Respecte le filtre `createdAt > deletedAt`
  // si l'user a soft-delete la conv. Utilisé pour pousser la valeur
  // authoritative via WS au lieu d'un increment client.
  // -----------------------------------------------------------------
  async getConversationUnreadCount(
    userId: number,
    conversationId: number,
  ): Promise<number> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: {
        user1Id: true,
        user1DeletedAt: true,
        user2DeletedAt: true,
      },
    });
    if (!conv) return 0;
    const deletedAt = this.getDeletedAtForUser(conv, userId);
    return this.prisma.message.count({
      where: {
        conversationId,
        readAt: null,
        NOT: { senderId: userId },
        ...(deletedAt ? { createdAt: { gt: deletedAt } } : {}),
      },
    });
  }

  // -----------------------------------------------------------------
  // POST /conversations
  //
  // Une conversation est strictement 1-1 entre deux utilisateurs : il ne peut
  // donc en exister qu'une seule entre un couple donné. On résout la paire
  // canonique (user1Id < user2Id) et on upsert dessus.
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

    // Le destinataire doit exister et être ACTIF
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

    const { user1Id, user2Id } = canonicalPair(requesterId, dto.recipientId);
    const initialContent = dto.initialMessage?.trim();
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.upsert({
        where: { unique_conversation_per_pair: { user1Id, user2Id } },
        create: { user1Id, user2Id },
        update: {},
        include: {
          user1: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
          user2: {
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

    // Pour le DTO retourné, on récupère l'asso primaire de l'AUTRE user.
    const otherUserId = this.getOtherUserId(result.conv, requesterId);
    const otherUserAssociation = await this.findPrimaryAssociation(otherUserId);

    const listItem = this.toListItem(
      result.conv,
      requesterId,
      0,
      otherUserAssociation,
    );
    return { conversation: listItem, firstMessage: result.firstMessage };
  }

  // -----------------------------------------------------------------
  // Asso primaire d'un utilisateur (la plus ancienne membership).
  // `null` si l'utilisateur n'est membre d'aucune association.
  // Règle métier : un user n'a qu'UNE asso à la fois (cf.
  // AssociationService.addMember) — donc on en récupère une seule.
  // -----------------------------------------------------------------
  async findPrimaryAssociation(userId: number): Promise<PrimaryAssociation> {
    const membership = await this.prisma.associationUser.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        association: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    return membership ? membership.association : null;
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
        OR: [{ user1Id: userId }, { user2Id: userId }],
        // On inclut TOUTES les conv (même sans message). Les conv "vides"
        // (créées par un clic 'Contacter' sans envoi) sont filtrées côté
        // frontend (`lastMessage !== null`) pour ne pas polluer la liste,
        // mais elles doivent rester dans le store pour que le titre/header
        // de l'écran de discussion puisse afficher le nom du destinataire.
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        user2: {
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

    // Pour chaque conv visible : récupère le dernier message, le compteur
    // non-lus, ET l'asso primaire de l'AUTRE utilisateur (affichée en "via").
    // Le N+1 est borné par le nombre de conv par user.
    const enriched = await Promise.all(
      visible.map(async (conv) => {
        const deletedAt = this.getDeletedAtForUser(conv, userId);
        const dateFilter = deletedAt ? { createdAt: { gt: deletedAt } } : {};
        const otherUserId = this.getOtherUserId(conv, userId);

        const [lastMessage, unreadCount, otherUserAssociation] =
          await Promise.all([
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
            this.findPrimaryAssociation(otherUserId),
          ]);

        return { conv, lastMessage, unreadCount, otherUserAssociation };
      }),
    );

    return enriched.map(
      ({ conv, lastMessage, unreadCount, otherUserAssociation }) => {
        const item = this.toListItem(
          conv,
          userId,
          unreadCount,
          otherUserAssociation,
        );
        if (lastMessage) {
          item.lastMessage = {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt.toISOString(),
          };
        }
        return item;
      },
    );
  }

  // -----------------------------------------------------------------
  // GET /conversations/unread-count
  // -----------------------------------------------------------------
  async getUnreadCount(userId: number): Promise<UnreadCountDto> {
    // On ne peut pas se contenter d'un count Prisma : il faut filtrer
    // les messages selon `createdAt > <user>DeletedAt`. On récupère les
    // metadonnées minimales puis on agrège côté JS.
    const convs = await this.prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: {
        id: true,
        user1Id: true,
        user1DeletedAt: true,
        user2DeletedAt: true,
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
    conv: ConversationWithUsers,
    currentUserId: number,
    unreadCount: number,
    otherUserAssociation: PrimaryAssociation,
  ): ConversationListItemDto {
    const other = conv.user1Id === currentUserId ? conv.user2 : conv.user1;
    return {
      id: conv.id,
      otherUser: {
        id: other.id,
        firstName: other.firstName,
        lastName: other.lastName,
        profilePicture: other.profilePicture,
      },
      otherUserAssociation,
      lastMessage: null,
      unreadCount,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: (conv.lastMessageAt ?? conv.createdAt).toISOString(),
    };
  }
}
