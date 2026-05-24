import { Test, TestingModule } from '@nestjs/testing';
import { MissionReminderService } from './mission-reminder.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';

const mockPrisma = {
  missionParticipant: { findMany: jest.fn() },
};

const mockMail = {
  sendMissionReminderEmail: jest.fn(),
};

const mockNotifications = {
  sendPushNotifications: jest.fn(),
};

const buildParticipant = (overrides: {
  userId: number;
  email?: string;
  firstName?: string;
  emailNotifications?: boolean;
  pushToken?: string | null;
  missionId: number;
  title?: string;
  startDate?: Date | null;
  associationName?: string;
}) => ({
  user: {
    id: overrides.userId,
    email: overrides.email ?? `user${overrides.userId}@test.fr`,
    firstName: overrides.firstName ?? `User${overrides.userId}`,
    emailNotifications: overrides.emailNotifications ?? false,
    pushToken: overrides.pushToken ?? null,
  },
  mission: {
    id: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    // 'in' check pour distinguer `startDate: null` (volontaire) de l'absence d'override
    startDate:
      'startDate' in overrides
        ? overrides.startDate
        : new Date('2026-05-21T14:00:00Z'),
    association: { name: overrides.associationName ?? 'Restos du Cœur' },
  },
});

describe('MissionReminderService', () => {
  let service: MissionReminderService;
  // Date "now" servant de référence : 2026-05-20 09:00 → demain = 2026-05-21
  const now = new Date('2026-05-20T09:00:00');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionReminderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<MissionReminderService>(MissionReminderService);
    jest.clearAllMocks();
  });

  describe('sendReminders — fenêtre de requête', () => {
    it('✅ interroge prisma sur [demain 00:00, surlendemain 00:00[ et status ACTIVE', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([]);

      await service.sendReminders(now);

      expect(mockPrisma.missionParticipant.findMany).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.missionParticipant.findMany.mock.calls[0][0];

      const expectedStart = new Date('2026-05-21T00:00:00');
      const expectedEnd = new Date('2026-05-22T00:00:00');

      expect(arg.where.mission.status).toBe('ACTIVE');
      expect(arg.where.mission.startDate.gte.getTime()).toBe(
        expectedStart.getTime(),
      );
      expect(arg.where.mission.startDate.lt.getTime()).toBe(
        expectedEnd.getTime(),
      );
    });

    it("✅ ne fait rien si aucune mission n'a lieu demain", async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([]);

      await service.sendReminders(now);

      expect(mockMail.sendMissionReminderEmail).not.toHaveBeenCalled();
      expect(mockNotifications.sendPushNotifications).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders — filtrage emailNotifications', () => {
    it('✅ envoie un email si emailNotifications=true', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          emailNotifications: true,
        }),
      ]);

      await service.sendReminders(now);

      expect(mockMail.sendMissionReminderEmail).toHaveBeenCalledTimes(1);
      expect(mockMail.sendMissionReminderEmail).toHaveBeenCalledWith(
        'user1@test.fr',
        'User1',
        expect.arrayContaining([
          expect.objectContaining({ id: 10, title: 'Mission 10' }),
        ]),
      );
    });

    it("❌ n'envoie pas d'email si emailNotifications=false", async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          emailNotifications: false,
        }),
      ]);

      await service.sendReminders(now);

      expect(mockMail.sendMissionReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders — push mobile', () => {
    it('✅ envoie un push si pushToken présent (indépendamment de emailNotifications)', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          emailNotifications: false,
          pushToken: 'ExponentPushToken[xxx]',
        }),
      ]);

      await service.sendReminders(now);

      expect(mockNotifications.sendPushNotifications).toHaveBeenCalledTimes(1);
      const messages = mockNotifications.sendPushNotifications.mock.calls[0][0];
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(
        expect.objectContaining({
          to: 'ExponentPushToken[xxx]',
          title: expect.stringContaining('Rappel'),
          body: 'Mission 10',
          data: { missionId: 10 },
        }),
      );
    });

    it("❌ n'envoie pas de push si pushToken null", async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          pushToken: null,
        }),
      ]);

      await service.sendReminders(now);

      expect(mockNotifications.sendPushNotifications).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders — groupement par utilisateur', () => {
    it('✅ groupe les missions par user et envoie 1 email avec la liste', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          title: 'Distribution alimentaire',
          emailNotifications: true,
        }),
        buildParticipant({
          userId: 1,
          missionId: 11,
          title: 'Maraude',
          emailNotifications: true,
        }),
      ]);

      await service.sendReminders(now);

      expect(mockMail.sendMissionReminderEmail).toHaveBeenCalledTimes(1);
      const missionsArg = mockMail.sendMissionReminderEmail.mock.calls[0][2];
      expect(missionsArg).toHaveLength(2);
      expect(missionsArg.map((m: { title: string }) => m.title)).toEqual([
        'Distribution alimentaire',
        'Maraude',
      ]);
    });

    it('✅ envoie 1 push par mission pour permettre le deep-link individuel', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          pushToken: 'ExponentPushToken[a]',
        }),
        buildParticipant({
          userId: 1,
          missionId: 11,
          pushToken: 'ExponentPushToken[a]',
        }),
      ]);

      await service.sendReminders(now);

      expect(mockNotifications.sendPushNotifications).toHaveBeenCalledTimes(1);
      const messages = mockNotifications.sendPushNotifications.mock.calls[0][0];
      expect(messages).toHaveLength(2);
      expect(
        messages.map((m: { data: { missionId: number } }) => m.data.missionId),
      ).toEqual([10, 11]);
    });

    it('✅ traite indépendamment plusieurs utilisateurs', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          emailNotifications: true,
        }),
        buildParticipant({
          userId: 2,
          missionId: 11,
          emailNotifications: true,
          pushToken: 'ExponentPushToken[user2]',
        }),
      ]);

      await service.sendReminders(now);

      expect(mockMail.sendMissionReminderEmail).toHaveBeenCalledTimes(2);
      expect(mockNotifications.sendPushNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendReminders — robustesse', () => {
    it('✅ ignore les missions sans startDate', async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          startDate: null,
          emailNotifications: true,
          pushToken: 'ExponentPushToken[a]',
        }),
      ]);

      await service.sendReminders(now);

      expect(mockMail.sendMissionReminderEmail).not.toHaveBeenCalled();
      expect(mockNotifications.sendPushNotifications).not.toHaveBeenCalled();
    });

    it("✅ continue le traitement si l'envoi email échoue pour un user", async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          emailNotifications: true,
        }),
        buildParticipant({
          userId: 2,
          missionId: 11,
          emailNotifications: true,
        }),
      ]);
      mockMail.sendMissionReminderEmail
        .mockRejectedValueOnce(new Error('Brevo down'))
        .mockResolvedValueOnce(undefined);

      await expect(service.sendReminders(now)).resolves.not.toThrow();

      expect(mockMail.sendMissionReminderEmail).toHaveBeenCalledTimes(2);
    });

    it("✅ continue le traitement si l'envoi push échoue", async () => {
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        buildParticipant({
          userId: 1,
          missionId: 10,
          pushToken: 'ExponentPushToken[a]',
        }),
      ]);
      mockNotifications.sendPushNotifications.mockRejectedValueOnce(
        new Error('Expo down'),
      );

      await expect(service.sendReminders(now)).resolves.not.toThrow();
    });
  });
});
