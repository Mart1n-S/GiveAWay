import { Injectable } from '@nestjs/common';
import type { MessageDto, MessagesPageDto, SendMessageDto } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
  ) {}

  // -----------------------------------------------------------------
  // Pagination cursor-based des messages d'une conversation
  // -----------------------------------------------------------------
  async getMessages(
    userId: number,
    conversationId: number,
    before: number | undefined,
    limit: number,
  ): Promise<MessagesPageDto> {
    await this.conversationService.assertOwnership(conversationId, userId);

    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { id: { lt: before } } : {}),
      },
      orderBy: { id: 'desc' },
      take: safeLimit + 1,
    });

    const hasMore = rows.length > safeLimit;
    const slice = rows.slice(0, safeLimit);
    const nextCursor = slice.length > 0 ? slice[slice.length - 1].id : null;

    return {
      messages: slice.map((m) => this.conversationService.toMessageDto(m)),
      nextCursor: hasMore ? nextCursor : null,
      hasMore,
    };
  }

  // -----------------------------------------------------------------
  // Envoi d'un message (utilisé par le gateway WS)
  // -----------------------------------------------------------------
  async send(
    senderId: number,
    dto: SendMessageDto,
  ): Promise<{ message: MessageDto; recipientId: number }> {
    const conv = await this.conversationService.assertOwnership(
      dto.conversationId,
      senderId,
    );

    const trimmed = dto.content.trim();
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId,
          content: trimmed,
        },
      });
      await tx.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: now },
      });
      return msg;
    });

    return {
      message: this.conversationService.toMessageDto(created),
      recipientId: this.conversationService.getRecipientId(conv, senderId),
    };
  }

  // -----------------------------------------------------------------
  // Marque tous les messages reçus comme lus
  // -----------------------------------------------------------------
  async markConversationRead(
    userId: number,
    conversationId: number,
  ): Promise<{ messageIds: number[]; senderIds: number[]; readAt: Date }> {
    await this.conversationService.assertOwnership(conversationId, userId);

    const unread = await this.prisma.message.findMany({
      where: {
        conversationId,
        readAt: null,
        NOT: { senderId: userId },
      },
      select: { id: true, senderId: true },
    });

    if (unread.length === 0) {
      return { messageIds: [], senderIds: [], readAt: new Date() };
    }

    const readAt = new Date();
    await this.prisma.message.updateMany({
      where: { id: { in: unread.map((m) => m.id) } },
      data: { readAt },
    });

    const senderIds = Array.from(new Set(unread.map((m) => m.senderId)));
    return {
      messageIds: unread.map((m) => m.id),
      senderIds,
      readAt,
    };
  }
}
