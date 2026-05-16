import { Test, TestingModule } from '@nestjs/testing';
import { MessagingPushService } from './messaging-push.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { MessagingEvents } from './messaging.events';

const mockPrisma = {
  user: { findUnique: jest.fn() },
};
const mockNotifs = { sendPushNotifications: jest.fn() };
const mockEvents = { isUserInConversationRoom: jest.fn() };

const msg = {
  id: 1,
  conversationId: 10,
  senderId: 5,
  content: 'hello world',
  createdAt: '2026-01-01T10:00:00Z',
  readAt: null,
};

const sender = { firstName: 'Alice', lastName: 'Dupont' };

describe('MessagingPushService', () => {
  let service: MessagingPushService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingPushService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotifs },
        { provide: MessagingEvents, useValue: mockEvents },
      ],
    }).compile();
    service = mod.get(MessagingPushService);
    jest.clearAllMocks();
  });

  it('ne push pas si le destinataire est dans la conv', async () => {
    mockEvents.isUserInConversationRoom.mockResolvedValue(true);
    await service.notifyIfOffline(10, 99, sender, msg);
    expect(mockNotifs.sendPushNotifications).not.toHaveBeenCalled();
  });

  it('ne push pas si pas de pushToken', async () => {
    mockEvents.isUserInConversationRoom.mockResolvedValue(false);
    mockPrisma.user.findUnique.mockResolvedValue({ pushToken: null });
    await service.notifyIfOffline(10, 99, sender, msg);
    expect(mockNotifs.sendPushNotifications).not.toHaveBeenCalled();
  });

  it('push avec title=nom expéditeur et data.conversationId', async () => {
    mockEvents.isUserInConversationRoom.mockResolvedValue(false);
    mockPrisma.user.findUnique.mockResolvedValue({
      pushToken: 'ExponentPushToken[xxx]',
    });
    await service.notifyIfOffline(10, 99, sender, msg);
    expect(mockNotifs.sendPushNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        to: 'ExponentPushToken[xxx]',
        title: 'Alice Dupont',
        body: 'hello world',
        sound: 'default',
        data: { type: 'message', conversationId: 10 },
      }),
    ]);
  });

  it('tronque le contenu à 120 caractères', async () => {
    mockEvents.isUserInConversationRoom.mockResolvedValue(false);
    mockPrisma.user.findUnique.mockResolvedValue({
      pushToken: 'ExponentPushToken[xxx]',
    });
    const longMsg = { ...msg, content: 'a'.repeat(200) };
    await service.notifyIfOffline(10, 99, sender, longMsg);
    const payload = mockNotifs.sendPushNotifications.mock.calls[0][0][0];
    expect(payload.body.length).toBe(120);
  });

  it("ne crash pas en cas d'erreur Prisma", async () => {
    mockEvents.isUserInConversationRoom.mockResolvedValue(false);
    mockPrisma.user.findUnique.mockRejectedValue(new Error('boom'));
    await expect(
      service.notifyIfOffline(10, 99, sender, msg),
    ).resolves.toBeUndefined();
  });
});
