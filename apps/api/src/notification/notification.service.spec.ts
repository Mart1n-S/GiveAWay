import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { updateMany: jest.fn() },
};

const mockFetchOk = (tickets: any[]) =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: tickets }),
    text: () => Promise.resolve(''),
  });

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  // =========================================================================
  // sendPushNotifications — filtrage
  // =========================================================================
  describe('sendPushNotifications — filtrage', () => {
    it('✅ ne fait aucun appel fetch si la liste est vide', async () => {
      global.fetch = jest.fn();

      await service.sendPushNotifications([]);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('✅ ne fait aucun appel fetch si aucun token ne commence par ExponentPushToken', async () => {
      global.fetch = jest.fn();

      await service.sendPushNotifications([
        { to: 'invalid-token', title: 'T', body: 'B' },
        { to: 'fcm://foo', title: 'T', body: 'B' },
      ]);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('✅ envoie uniquement les tokens valides (filtre les invalides)', async () => {
      global.fetch = mockFetchOk([{ status: 'ok' }]);

      await service.sendPushNotifications([
        { to: 'ExponentPushToken[valid1]', title: 'T', body: 'B' },
        { to: 'invalid', title: 'T', body: 'B' },
      ]);

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body).toHaveLength(1);
      expect(body[0].to).toBe('ExponentPushToken[valid1]');
    });
  });

  // =========================================================================
  // sendPushNotifications — appel HTTP
  // =========================================================================
  describe('sendPushNotifications — appel HTTP', () => {
    it('✅ appelle EXPO_PUSH_URL avec la bonne méthode et les bons headers', async () => {
      global.fetch = mockFetchOk([{ status: 'ok' }]);

      await service.sendPushNotifications([
        { to: 'ExponentPushToken[abc]', title: 'Hello', body: 'World' },
      ]);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('exp.host'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('✅ passe le bon payload dans le body', async () => {
      global.fetch = mockFetchOk([{ status: 'ok' }]);

      const msg = {
        to: 'ExponentPushToken[abc]',
        title: 'Nouvelle mission',
        body: 'Mission test',
        data: { missionId: 42 },
        sound: 'default' as const,
      };

      await service.sendPushNotifications([msg]);

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body[0]).toMatchObject({
        to: 'ExponentPushToken[abc]',
        title: 'Nouvelle mission',
        body: 'Mission test',
        data: { missionId: 42 },
      });
    });

    it('✅ ne lève pas si fetch échoue (erreur réseau)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendPushNotifications([
          { to: 'ExponentPushToken[abc]', title: 'T', body: 'B' },
        ]),
      ).resolves.toBeUndefined();
    });

    it('✅ ne lève pas si la réponse HTTP est en erreur (4xx/5xx)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error'),
      });

      await expect(
        service.sendPushNotifications([
          { to: 'ExponentPushToken[abc]', title: 'T', body: 'B' },
        ]),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // sendPushNotifications — batching (chunks de 100)
  // =========================================================================
  describe('sendPushNotifications — batching', () => {
    it('✅ envoie en un seul appel si ≤ 100 messages', async () => {
      global.fetch = mockFetchOk(Array(50).fill({ status: 'ok' }));

      const messages = Array.from({ length: 50 }, (_, i) => ({
        to: `ExponentPushToken[token${i}]`,
        title: 'T',
        body: 'B',
      }));

      await service.sendPushNotifications(messages);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('✅ découpe en 2 appels si > 100 messages', async () => {
      global.fetch = mockFetchOk(Array(60).fill({ status: 'ok' }));

      const messages = Array.from({ length: 120 }, (_, i) => ({
        to: `ExponentPushToken[token${i}]`,
        title: 'T',
        body: 'B',
      }));

      await service.sendPushNotifications(messages);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // cleanInvalidTokens — nettoyage des DeviceNotRegistered
  // =========================================================================
  describe('cleanInvalidTokens', () => {
    it('✅ supprime les tokens marqués DeviceNotRegistered', async () => {
      global.fetch = mockFetchOk([
        { status: 'ok' },
        {
          status: 'error',
          details: {
            error: 'DeviceNotRegistered',
            expoPushToken: 'ExponentPushToken[dead]',
          },
        },
      ]);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      await service.sendPushNotifications([
        { to: 'ExponentPushToken[alive]', title: 'T', body: 'B' },
        { to: 'ExponentPushToken[dead]', title: 'T', body: 'B' },
      ]);

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { pushToken: { in: ['ExponentPushToken[dead]'] } },
        data: { pushToken: null },
      });
    });

    it('✅ ne fait pas de updateMany si tous les tickets sont ok', async () => {
      global.fetch = mockFetchOk([{ status: 'ok' }, { status: 'ok' }]);

      await service.sendPushNotifications([
        { to: 'ExponentPushToken[a]', title: 'T', body: 'B' },
        { to: 'ExponentPushToken[b]', title: 'T', body: 'B' },
      ]);

      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it("✅ ne fait pas de updateMany si l'erreur n'est pas DeviceNotRegistered", async () => {
      global.fetch = mockFetchOk([
        {
          status: 'error',
          details: { error: 'MessageTooBig' },
        },
      ]);

      await service.sendPushNotifications([
        { to: 'ExponentPushToken[a]', title: 'T', body: 'B' },
      ]);

      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });
  });
});
