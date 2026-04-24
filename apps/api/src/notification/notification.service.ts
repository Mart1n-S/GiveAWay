import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  details?: {
    error?: string;
    expoPushToken?: string;
  };
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly EXPO_PUSH_URL =
    process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly prisma: PrismaService) {}

  async sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
    const valid = messages.filter((m) => m.to.startsWith('ExponentPushToken'));
    if (valid.length === 0) return;

    const chunks = this.chunk(valid, 100);
    for (const chunk of chunks) {
      try {
        const res = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        if (!res.ok) {
          this.logger.warn(
            `Expo push API responded ${res.status}: ${await res.text()}`,
          );
          continue;
        }

        const responseData: ExpoPushResponse = await res.json();
        await this.cleanInvalidTokens(responseData.data, chunk);
      } catch (err) {
        this.logger.error('Failed to reach Expo push API', err);
      }
    }
  }

  private async cleanInvalidTokens(
    tickets: ExpoPushTicket[],
    messages: ExpoPushMessage[],
  ): Promise<void> {
    const invalidTokens = tickets
      .map((ticket, i) => ({ ticket, token: messages[i]?.to }))
      .filter(
        ({ ticket }) =>
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered',
      )
      .map(({ token }) => token)
      .filter((t): t is string => t !== undefined);

    if (invalidTokens.length === 0) return;

    this.logger.log(`Cleaning ${invalidTokens.length} invalid push token(s)`);

    await this.prisma.user.updateMany({
      where: { pushToken: { in: invalidTokens } },
      data: { pushToken: null },
    });
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
}
