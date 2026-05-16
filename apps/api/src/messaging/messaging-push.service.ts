import { Injectable, Logger } from '@nestjs/common';
import type { MessageDto } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { MessagingEvents } from './messaging.events';

/**
 * Envoie une notification push au destinataire si :
 * 1. Il n'est pas dans la room de la conversation (= conv non-ouverte)
 * 2. Il dispose d'un pushToken Expo valide
 */
@Injectable()
export class MessagingPushService {
  private readonly logger = new Logger(MessagingPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly events: MessagingEvents,
  ) {}

  async notifyIfOffline(
    conversationId: number,
    recipientId: number,
    sender: { firstName: string; lastName: string },
    message: MessageDto,
  ): Promise<void> {
    try {
      const inRoom = await this.events.isUserInConversationRoom(
        conversationId,
        recipientId,
      );
      if (inRoom) return;

      const recipient = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { pushToken: true },
      });
      if (!recipient?.pushToken) return;

      const title =
        `${sender.firstName} ${sender.lastName}`.trim() || 'Nouveau message';
      const body = message.content.slice(0, 120);

      await this.notifications.sendPushNotifications([
        {
          to: recipient.pushToken,
          title,
          body,
          sound: 'default',
          data: { type: 'message', conversationId },
        },
      ]);
    } catch (err) {
      this.logger.warn(
        `Push notif failed for user ${recipientId}: ${(err as Error).message}`,
      );
    }
  }
}
