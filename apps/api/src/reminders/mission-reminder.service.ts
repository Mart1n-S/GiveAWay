import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';

export interface ReminderMission {
  id: number;
  title: string;
  startDate: Date;
  associationName: string;
}

interface ParticipantRow {
  user: {
    id: number;
    email: string;
    firstName: string;
    emailNotifications: boolean;
    pushToken: string | null;
  };
  mission: {
    id: number;
    title: string;
    startDate: Date | null;
    association: { name: string };
  };
}

@Injectable()
export class MissionReminderService {
  private readonly logger = new Logger(MissionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Cron quotidien à 9h00 Europe/Paris.
   * Envoie un rappel email (si emailNotifications=true) et un push mobile
   * (si pushToken présent) à chaque utilisateur ayant une mission le lendemain.
   */
  @Cron('0 9 * * *', { timeZone: 'Europe/Paris' })
  async handleDailyReminders(): Promise<void> {
    await this.sendReminders(new Date());
  }

  /**
   * Envoie les rappels pour les missions dont startDate tombe le lendemain de `now`.
   * Méthode publique pour faciliter les tests (injection d'une date fixe).
   */
  async sendReminders(now: Date): Promise<void> {
    const { start, end } = this.getTomorrowRange(now);

    const participants = (await this.prisma.missionParticipant.findMany({
      where: {
        mission: {
          status: 'ACTIVE',
          startDate: { gte: start, lt: end },
        },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            emailNotifications: true,
            pushToken: true,
          },
        },
        mission: {
          select: {
            id: true,
            title: true,
            startDate: true,
            association: { select: { name: true } },
          },
        },
      },
    })) as unknown as ParticipantRow[];

    if (participants.length === 0) {
      this.logger.log('Aucun rappel à envoyer pour demain');
      return;
    }

    const byUser = this.groupByUser(participants);
    this.logger.log(
      `Envoi de rappels J-1 à ${byUser.size} utilisateur(s) pour ${participants.length} mission(s)`,
    );

    for (const { user, missions } of byUser.values()) {
      const reminderMissions: ReminderMission[] = missions
        .filter(
          (m): m is ParticipantRow['mission'] & { startDate: Date } =>
            m.startDate !== null,
        )
        .map((m) => ({
          id: m.id,
          title: m.title,
          startDate: m.startDate,
          associationName: m.association.name,
        }));

      if (reminderMissions.length === 0) continue;

      if (user.emailNotifications && user.email) {
        await this.safeSendEmail(user.email, user.firstName, reminderMissions);
      }

      if (user.pushToken) {
        await this.safeSendPush(user.pushToken, reminderMissions);
      }
    }
  }

  private async safeSendEmail(
    email: string,
    firstName: string,
    missions: ReminderMission[],
  ): Promise<void> {
    try {
      await this.mail.sendMissionReminderEmail(email, firstName, missions);
    } catch (err) {
      this.logger.warn(
        `Email de rappel échoué pour ${email}: ${(err as Error).message}`,
      );
    }
  }

  private async safeSendPush(
    pushToken: string,
    missions: ReminderMission[],
  ): Promise<void> {
    try {
      await this.notifications.sendPushNotifications(
        missions.map((m) => ({
          to: pushToken,
          title: '🔔 Rappel : mission demain',
          body: m.title,
          data: { missionId: m.id },
          sound: 'default' as const,
        })),
      );
    } catch (err) {
      this.logger.warn(
        `Push de rappel échoué pour token ${pushToken.slice(0, 12)}…: ${(err as Error).message}`,
      );
    }
  }

  private groupByUser(
    participants: ParticipantRow[],
  ): Map<
    number,
    { user: ParticipantRow['user']; missions: ParticipantRow['mission'][] }
  > {
    const map = new Map<
      number,
      { user: ParticipantRow['user']; missions: ParticipantRow['mission'][] }
    >();

    for (const p of participants) {
      const entry = map.get(p.user.id);
      if (entry) {
        entry.missions.push(p.mission);
      } else {
        map.set(p.user.id, { user: p.user, missions: [p.mission] });
      }
    }

    return map;
  }

  /**
   * Retourne l'intervalle [00:00, 24:00[ du lendemain en heure locale serveur.
   * Le cron tournant en Europe/Paris, `now` arrive vers 9h Paris ; demain = J+1 00h → 24h.
   */
  private getTomorrowRange(now: Date): { start: Date; end: Date } {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + 1);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }
}
