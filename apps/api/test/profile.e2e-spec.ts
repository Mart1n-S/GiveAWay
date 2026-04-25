import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { FILE_SERVICE } from '../src/common/files/interfaces/file-service.interface';
import {
  cleanDatabase,
  prisma,
  createTestUser,
  createTestAssociation,
  createTestMission,
  createTestMissionParticipant,
} from './prisma-test-helper';
import { ActivityType } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

// ── Types locaux ──────────────────────────────────────────────────

interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginResponseBody {
  backendTokens?: BackendTokens;
}

// ── Mock FileService ──────────────────────────────────────────────

const mockFileService = {
  uploadFile: jest.fn().mockResolvedValue({
    publicId: 'giveaway/mock_id',
    url: 'https://mock-url/mock.jpg',
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFileForDownload: jest.fn().mockResolvedValue({
    type: 'redirect',
    url: 'https://mock-url/mock.pdf',
  }),
};

// ── Suite ─────────────────────────────────────────────────────────

describe('Profile Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;

  // ── Helper login ─────────────────────────────────────────────────
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

  // ── Setup / Teardown ─────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_SERVICE)
      .useValue(mockFileService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    httpServer = app.getHttpServer() as App;
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // GET /profile/follows
  // ===========================================================================
  describe('GET /profile/follows', () => {
    it('❌ 401 — retourne 401 sans authentification', async () => {
      await request(httpServer).get('/profile/follows').expect(401);
    });

    it('✅ 200 — retourne un tableau vide pour un utilisateur sans abonnements', async () => {
      await createTestUser(0);
      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/follows')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('✅ 200 — retourne les associations suivies avec le bon shape', async () => {
      const user = await createTestUser(0);
      const owner = await createTestUser(1);
      const association = await createTestAssociation(owner.id);

      await prisma.userAssociationFollow.create({
        data: { userId: user.id, associationId: association.id },
      });

      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/follows')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);

      const item = res.body[0] as {
        id: number;
        name: string;
        logoUrl: string | null;
        city: string | null;
      };
      expect(typeof item.id).toBe('number');
      expect(item.id).toBe(association.id);
      expect(typeof item.name).toBe('string');
      expect('logoUrl' in item).toBe(true);
      expect('city' in item).toBe(true);
    });

    it("✅ 200 — ne retourne pas les associations suivies d'un autre utilisateur", async () => {
      const user = await createTestUser(0);
      const otherUser = await createTestUser(1);
      const owner = await createTestUser(2);
      const association = await createTestAssociation(owner.id);

      // Seul otherUser suit l'association
      await prisma.userAssociationFollow.create({
        data: { userId: otherUser.id, associationId: association.id },
      });

      // user ne suit aucune association
      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/follows')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);

      // Vérification que user existe bien (pas de confusion d'identité)
      expect(user.id).not.toBe(otherUser.id);
    });
  });

  // ===========================================================================
  // GET /profile/participations/stats
  // ===========================================================================
  describe('GET /profile/participations/stats', () => {
    it('❌ 401 — retourne 401 sans authentification', async () => {
      await request(httpServer)
        .get('/profile/participations/stats')
        .expect(401);
    });

    it('✅ 200 — retourne des stats vides pour un user sans participation', async () => {
      await createTestUser(0);
      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/participations/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as {
        summary: {
          totalParticipations: number;
          distinctAssociations: number;
          totalHours: number | null;
          mostFrequentType: string | null;
        };
        participations: unknown[];
        byType: unknown[];
        byMonth: unknown[];
        byAssociation: unknown[];
      };

      expect(body.summary).toBeDefined();
      expect(body.summary.totalParticipations).toBe(0);
      expect(body.summary.totalHours).toBeNull();
      expect(body.summary.distinctAssociations).toBe(0);
      expect(body.summary.mostFrequentType).toBeNull();
      expect(Array.isArray(body.participations)).toBe(true);
      expect(body.participations).toHaveLength(0);
    });

    it('✅ 200 — retourne les stats correctes avec une participation', async () => {
      const user = await createTestUser(0);
      const owner = await createTestUser(1);
      const association = await createTestAssociation(owner.id);
      const mission = await createTestMission(association.id);
      await createTestMissionParticipant(mission.id, user.id);

      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/participations/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as {
        summary: {
          totalParticipations: number;
          distinctAssociations: number;
        };
        participations: unknown[];
      };

      expect(body.summary.totalParticipations).toBe(1);
      expect(body.summary.distinctAssociations).toBe(1);
      expect(body.participations).toHaveLength(1);
    });

    it('✅ 200 — filtre par type de mission (?type=EVENT) ne retourne pas les missions MISSION', async () => {
      const user = await createTestUser(0);
      const owner = await createTestUser(1);
      const association = await createTestAssociation(owner.id);

      // Crée une mission de type MISSION (pas EVENT)
      const mission = await createTestMission(association.id, {
        type: ActivityType.MISSION,
      });
      await createTestMissionParticipant(mission.id, user.id);

      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/participations/stats?type=EVENT')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as {
        summary: { totalParticipations: number };
        participations: unknown[];
      };

      // Le filtre ?type=EVENT exclut les missions de type MISSION
      expect(body.summary.totalParticipations).toBe(0);
      expect(body.participations).toHaveLength(0);
    });

    it('✅ 200 — retourne les participations avec le bon shape', async () => {
      const user = await createTestUser(0);
      const owner = await createTestUser(1);
      const association = await createTestAssociation(owner.id);
      const mission = await createTestMission(association.id, {
        type: ActivityType.MISSION,
      });
      await createTestMissionParticipant(mission.id, user.id);

      const token = await loginUser('e2e.0@test.com', 'Password123!');

      const res = await request(httpServer)
        .get('/profile/participations/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as {
        participations: {
          missionId: number;
          createdAt: string;
          mission: {
            id: number;
            title: string;
            type: string;
            availabilityType: string | null;
            startDate: string | null;
            durationInt: number | null;
            causes: unknown[];
            association: {
              id: number;
              name: string;
            };
          };
        }[];
      };

      expect(body.participations).toHaveLength(1);

      const participation = body.participations[0];
      expect(typeof participation.missionId).toBe('number');
      expect(participation.missionId).toBe(mission.id);
      expect(typeof participation.createdAt).toBe('string');

      expect(participation.mission).toBeDefined();
      expect(typeof participation.mission.title).toBe('string');
      expect(typeof participation.mission.type).toBe('string');
      expect(participation.mission.type).toBe('MISSION');
      expect(Array.isArray(participation.mission.causes)).toBe(true);

      expect(participation.mission.association).toBeDefined();
      expect(typeof participation.mission.association.id).toBe('number');
      expect(participation.mission.association.id).toBe(association.id);
    });
  });
});
