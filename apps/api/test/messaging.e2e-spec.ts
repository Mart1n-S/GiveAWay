import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { io, Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import { AppModule } from './../src/app.module';
import { FILE_SERVICE } from '../src/common/files/interfaces/file-service.interface';
import { NotificationService } from '../src/notification/notification.service';
import {
  cleanDatabase,
  prisma,
  createTestUser,
  createTestAssociation,
  addAssociationMember,
} from './prisma-test-helper';
import { AssociationRole, UserStatus } from '../src/generated/prisma/client';
import { WsEvents } from '@repo/shared';
import type { App } from 'supertest/types';

// ----------------------------------------------------------------
// Types locaux
// ----------------------------------------------------------------
interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
interface LoginResponseBody {
  backendTokens?: BackendTokens;
}

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------
const mockFileService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileForDownload: jest.fn(),
};
const mockNotifService = {
  sendPushNotifications: jest.fn().mockResolvedValue(undefined),
};

// ----------------------------------------------------------------
// Helpers WS
// ----------------------------------------------------------------
/**
 * Établit une connexion WS et attend la confirmation d'auth via
 * l'événement initial unread:count. Si la connexion est rejetée
 * (token invalide, user inactif, etc.), le serveur envoie un
 * "error" puis ferme — on rejette la promesse.
 */
function connectSocket(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/ws/messaging`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    const cleanup = () => {
      socket.off('connect_error');
      socket.off('error');
      socket.off('disconnect');
      socket.off(WsEvents.SERVER_UNREAD_COUNT);
    };
    const fail = (err: unknown) => {
      cleanup();
      socket.disconnect();
      reject(err instanceof Error ? err : new Error(String(err ?? 'WS error')));
    };
    socket.once('connect_error', fail);
    socket.once('error', fail);
    socket.once('disconnect', () =>
      fail(new Error('WS disconnected before auth confirmation')),
    );
    socket.once(WsEvents.SERVER_UNREAD_COUNT, () => {
      cleanup();
      resolve(socket);
    });
    setTimeout(() => fail(new Error('WS connection timeout')), 5000);
  });
}

function waitForEvent<T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event);
      reject(new Error(`Timeout waiting for "${event}"`));
    }, timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ----------------------------------------------------------------
// Suite
// ----------------------------------------------------------------
describe('Messaging Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;
  let baseUrl: string;

  let volunteerId: number;
  let memberId: number;
  let outsiderId: number;

  let associationId: number;
  let memberAssocId: number;

  let volunteerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  const loginUser = async (
    email: string,
    password: string,
  ): Promise<string> => {
    const res = await request(httpServer)
      .post('/auth/login')
      .set('x-client-type', 'mobile')
      .send({ email, password });
    const body = res.body as LoginResponseBody;
    return body.backendTokens?.accessToken ?? '';
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_SERVICE)
      .useValue(mockFileService)
      .overrideProvider(NotificationService)
      .useValue(mockNotifService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    // On a besoin d'écouter sur un port réel pour Socket.IO côté client
    await app.listen(0);
    const addr = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
    httpServer = app.getHttpServer() as App;
  });

  beforeEach(async () => {
    await cleanDatabase();
    mockNotifService.sendPushNotifications.mockClear();

    const volunteerUser = await createTestUser(0);
    const memberUser = await createTestUser(1);
    const outsiderUser = await createTestUser(2);
    volunteerId = volunteerUser.id;
    memberId = memberUser.id;
    outsiderId = outsiderUser.id;

    const assoc = await createTestAssociation(memberId);
    associationId = assoc.id;
    // Le créateur est OWNER (cf. helper) — on n'ajoute pas memberUser une 2e fois
    memberAssocId = (
      await prisma.associationUser.findFirstOrThrow({
        where: { associationId, userId: memberId },
      })
    ).id;

    volunteerToken = await loginUser('e2e.0@test.com', 'Password123!');
    memberToken = await loginUser('e2e.1@test.com', 'Password123!');
    outsiderToken = await loginUser('e2e.2@test.com', 'Password123!');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ============================================================
  // POST /conversations
  // ============================================================
  describe('POST /conversations', () => {
    it('✅ 201 — bénévole crée une conv avec un membre, message initial inclus', async () => {
      const res = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          associationId,
          recipientId: memberId,
          initialMessage: 'Bonjour, je voudrais aider',
        })
        .expect(201);

      const body = res.body as {
        conversation: {
          id: number;
          otherUser: { id: number };
          currentUserSide: string;
        };
        firstMessage: { id: number; content: string };
      };
      expect(body.conversation.otherUser.id).toBe(memberId);
      expect(body.conversation.currentUserSide).toBe('volunteer');
      expect(body.firstMessage.content).toBe('Bonjour, je voudrais aider');
    });

    it('✅ 201 — membre crée une conv avec un bénévole', async () => {
      const res = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          associationId,
          recipientId: volunteerId,
        })
        .expect(201);

      const body = res.body as {
        conversation: { currentUserSide: string; otherUser: { id: number } };
        firstMessage: null;
      };
      expect(body.conversation.currentUserSide).toBe('associationMember');
      expect(body.conversation.otherUser.id).toBe(volunteerId);
      expect(body.firstMessage).toBeNull();
    });

    it('✅ 201 — idempotent : retourne la conv existante (même id)', async () => {
      const r1 = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId })
        .expect(201);
      const r2 = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId })
        .expect(201);

      expect(
        (r1.body as { conversation: { id: number } }).conversation.id,
      ).toBe((r2.body as { conversation: { id: number } }).conversation.id);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .post('/conversations')
        .send({ associationId, recipientId: memberId })
        .expect(401);
    });

    it('❌ 400 — recipientId = soi-même', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: volunteerId })
        .expect(400);
    });

    it('❌ 403 — bénévole ↔ bénévole (aucun membre)', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: outsiderId })
        .expect(403);
    });

    it('❌ 403 — membre ↔ membre interdit', async () => {
      // On ajoute outsider comme membre EDITOR
      await addAssociationMember(
        associationId,
        outsiderId,
        AssociationRole.EDITOR,
      );
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ associationId, recipientId: outsiderId })
        .expect(403);
    });

    it('❌ 400 — message initial avec balises HTML', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          associationId,
          recipientId: memberId,
          initialMessage: '<script>xss</script>',
        })
        .expect(400);
    });
  });

  // ============================================================
  // POST /conversations/with-association/:associationId
  // ============================================================
  describe('POST /conversations/with-association/:associationId', () => {
    it("✅ 201 — bénévole peut contacter l'asso (auto-route vers OWNER)", async () => {
      const res = await request(httpServer)
        .post(`/conversations/with-association/${associationId}`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ initialMessage: 'Bonjour' })
        .expect(201);
      const body = res.body as {
        conversation: { otherUser: { id: number } };
        firstMessage: { content: string };
      };
      expect(body.conversation.otherUser.id).toBe(memberId);
      expect(body.firstMessage.content).toBe('Bonjour');
    });

    it("❌ 403 — un membre de l'asso ne peut pas s'auto-contacter via cette route", async () => {
      await request(httpServer)
        .post(`/conversations/with-association/${associationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .post(`/conversations/with-association/${associationId}`)
        .expect(401);
    });
  });

  // ============================================================
  // GET /conversations + unread-count
  // ============================================================
  describe('GET /conversations', () => {
    it("✅ retourne les conversations de l'utilisateur", async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId, initialMessage: 'hi' });

      const list = await request(httpServer)
        .get('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .expect(200);

      const body = list.body as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
    });

    it('✅ outsider voit aucune conversation', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });
      const list = await request(httpServer)
        .get('/conversations')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(200);
      expect((list.body as unknown[]).length).toBe(0);
    });
  });

  describe('GET /conversations/unread-count', () => {
    it('✅ compteur = 1 quand message reçu non-lu', async () => {
      // Le bénévole crée la conv avec un message
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          associationId,
          recipientId: memberId,
          initialMessage: 'hello',
        });

      // Vu côté membre, 1 conv non lue
      const res = await request(httpServer)
        .get('/conversations/unread-count')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect((res.body as { count: number }).count).toBe(1);
    });

    it('✅ compteur = 0 côté expéditeur', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          associationId,
          recipientId: memberId,
          initialMessage: 'hello',
        });
      const res = await request(httpServer)
        .get('/conversations/unread-count')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .expect(200);
      expect((res.body as { count: number }).count).toBe(0);
    });
  });

  // ============================================================
  // Historique messages (pagination)
  // ============================================================
  describe('GET /conversations/:id/messages', () => {
    let convId: number;

    beforeEach(async () => {
      const res = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });
      convId = (res.body as { conversation: { id: number } }).conversation.id;

      // Seed 50 messages
      for (let i = 1; i <= 50; i++) {
        await prisma.message.create({
          data: {
            conversationId: convId,
            senderId: i % 2 === 0 ? memberId : volunteerId,
            content: `msg ${i}`,
          },
        });
      }
      await prisma.conversation.update({
        where: { id: convId },
        data: { lastMessageAt: new Date() },
      });
    });

    it('✅ pagination par défaut : 30 messages, hasMore=true', async () => {
      const res = await request(httpServer)
        .get(`/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .expect(200);
      const body = res.body as {
        messages: { id: number }[];
        nextCursor: number;
        hasMore: boolean;
      };
      expect(body.messages.length).toBe(30);
      expect(body.hasMore).toBe(true);
      expect(typeof body.nextCursor).toBe('number');
    });

    it('✅ page suivante via "before"', async () => {
      const first = await request(httpServer)
        .get(`/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${volunteerToken}`);
      const cursor = (first.body as { nextCursor: number }).nextCursor;
      const second = await request(httpServer)
        .get(`/conversations/${convId}/messages?before=${cursor}&limit=30`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .expect(200);
      const body = second.body as {
        messages: { id: number }[];
        hasMore: boolean;
      };
      expect(body.messages.length).toBe(20);
      expect(body.hasMore).toBe(false);
    });

    it('❌ 403 — outsider ne peut pas lire les messages', async () => {
      await request(httpServer)
        .get(`/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });
  });

  // ============================================================
  // POST /conversations/:id/read
  // ============================================================
  describe('POST /conversations/:id/read', () => {
    it('✅ marque comme lu et baisse le compteur', async () => {
      const created = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId, initialMessage: 'hi' });
      const convId = (created.body as { conversation: { id: number } })
        .conversation.id;

      await request(httpServer)
        .post(`/conversations/${convId}/read`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const count = await request(httpServer)
        .get('/conversations/unread-count')
        .set('Authorization', `Bearer ${memberToken}`);
      expect((count.body as { count: number }).count).toBe(0);
    });
  });

  // ============================================================
  // CASCADES
  // ============================================================
  describe('Cascades', () => {
    it('✅ suppression user → conversations supprimées', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });

      await prisma.user.delete({ where: { id: volunteerId } });
      const remain = await prisma.conversation.count({
        where: { OR: [{ volunteerId }, { associationMemberId: volunteerId }] },
      });
      expect(remain).toBe(0);
    });

    it("✅ membre quitte l'asso → conversations correspondantes supprimées", async () => {
      // 1. On rétrograde memberId en EDITOR pour pouvoir le retirer
      //    (l'OWNER ne peut pas être retiré). On crée donc un autre user OWNER.
      const ownerUser = await createTestUser(5);
      await prisma.associationUser.update({
        where: {
          id: (
            await prisma.associationUser.findFirstOrThrow({
              where: { associationId, userId: memberId },
            })
          ).id,
        },
        data: { role: AssociationRole.EDITOR },
      });
      await prisma.associationUser.create({
        data: {
          associationId,
          userId: ownerUser.id,
          role: AssociationRole.OWNER,
        },
      });

      // 2. Création conv volunteer ↔ member
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });

      const before = await prisma.conversation.count({
        where: { associationId, associationMemberId: memberId },
      });
      expect(before).toBe(1);

      // 3. Le membre quitte
      const ownerToken = await loginUser('e2e.5@test.com', 'Password123!');
      await request(httpServer)
        .delete(`/associations/${associationId}/members/${memberAssocId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // 4. Conv supprimée
      const after = await prisma.conversation.count({
        where: { associationId, associationMemberId: memberId },
      });
      expect(after).toBe(0);
    });

    it('✅ association supprimée → conversations supprimées', async () => {
      await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });

      await prisma.association.delete({ where: { id: associationId } });
      const remain = await prisma.conversation.count({
        where: { associationId },
      });
      expect(remain).toBe(0);
    });
  });

  // ============================================================
  // WEBSOCKET
  // ============================================================
  describe('WebSocket /ws/messaging', () => {
    it('❌ refuse une connexion sans token', async () => {
      await expect(connectSocket(baseUrl, '')).rejects.toBeDefined();
    });

    it('❌ refuse une connexion avec token invalide', async () => {
      await expect(connectSocket(baseUrl, 'bad-token')).rejects.toBeDefined();
    });

    it('❌ refuse une connexion si user non-ACTIVE', async () => {
      await prisma.user.update({
        where: { id: volunteerId },
        data: { status: UserStatus.SUSPENDED },
      });
      // Re-login pour avoir un token nouveau... mais l'ancien JWT reste valide en signature.
      // Le guard vérifie quand même le statut en BDD à chaque handshake.
      await expect(
        connectSocket(baseUrl, volunteerToken),
      ).rejects.toBeDefined();
    });

    it('✅ accepte une connexion avec token valide', async () => {
      // connectSocket attend le 1er unread:count comme confirmation d'auth.
      const socket = await connectSocket(baseUrl, volunteerToken);
      try {
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });

    it('✅ envoi temps réel : destinataire reçoit message:new', async () => {
      const created = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });
      const convId = (created.body as { conversation: { id: number } })
        .conversation.id;

      const senderSocket = await connectSocket(baseUrl, volunteerToken);
      const receiverSocket = await connectSocket(baseUrl, memberToken);

      try {
        const received = waitForEvent<{
          conversationId: number;
          message: { content: string };
        }>(receiverSocket, WsEvents.SERVER_MESSAGE_NEW);

        senderSocket.emit(WsEvents.CLIENT_SEND_MESSAGE, {
          conversationId: convId,
          content: 'Hello en temps réel',
        });

        const payload = await received;
        expect(payload.conversationId).toBe(convId);
        expect(payload.message.content).toBe('Hello en temps réel');
      } finally {
        senderSocket.disconnect();
        receiverSocket.disconnect();
      }
    });

    it('✅ accusé de lecture : expéditeur reçoit message:read', async () => {
      const created = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          associationId,
          recipientId: memberId,
          initialMessage: 'hi',
        });
      const convId = (created.body as { conversation: { id: number } })
        .conversation.id;

      const senderSocket = await connectSocket(baseUrl, volunteerToken);
      const receiverSocket = await connectSocket(baseUrl, memberToken);
      try {
        const readEvent = waitForEvent<{
          conversationId: number;
          messageIds: number[];
        }>(senderSocket, WsEvents.SERVER_MESSAGE_READ);

        receiverSocket.emit(WsEvents.CLIENT_MARK_READ, {
          conversationId: convId,
        });

        const payload = await readEvent;
        expect(payload.conversationId).toBe(convId);
        expect(payload.messageIds.length).toBeGreaterThan(0);
      } finally {
        senderSocket.disconnect();
        receiverSocket.disconnect();
      }
    });

    it("❌ ne peut pas join une conversation qui n'appartient pas au user", async () => {
      const created = await request(httpServer)
        .post('/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ associationId, recipientId: memberId });
      const convId = (created.body as { conversation: { id: number } })
        .conversation.id;

      const outsiderSocket = await connectSocket(baseUrl, outsiderToken);
      try {
        const result: { ok?: boolean; error?: unknown } = await new Promise(
          (resolve) => {
            outsiderSocket.emit(
              WsEvents.CLIENT_JOIN_CONVERSATION,
              { conversationId: convId },
              (ack: unknown) =>
                resolve(ack as { ok?: boolean; error?: unknown }),
            );
            setTimeout(() => resolve({ error: 'timeout' }), 2000);
          },
        );
        expect(result.ok).not.toBe(true);
      } finally {
        outsiderSocket.disconnect();
      }
    });
  });
});
