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
  addAssociationMember,
  createTestMission,
} from './prisma-test-helper';
import {
  AssociationRole,
  AssociationStatus,
  MissionStatus,
} from '../src/generated/prisma/client';
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

// ── Payload de mission valide ─────────────────────────────────────

const VALID_MISSION_PAYLOAD = {
  title: 'Mission E2E créée via API',
  description:
    'Description suffisamment longue pour passer la validation du schéma Zod.',
  type: 'MISSION',
  availabilityType: 'REMOTE',
  hasRegistration: true,
};

// ── Suite ─────────────────────────────────────────────────────────

describe('AssociationMissions Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;

  let associationId: number;

  let ownerToken: string;
  let editorToken: string;
  let adminToken: string;
  let outsiderToken: string;

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

    // 4 utilisateurs : owner, admin, editor, outsider
    const owner = await createTestUser(0);
    const admin = await createTestUser(1);
    const editor = await createTestUser(2);
    await createTestUser(3);

    // Association VALIDATED avec l'owner
    const assoc = await createTestAssociation(owner.id);
    associationId = assoc.id;

    // Ajout des membres
    await addAssociationMember(associationId, admin.id, AssociationRole.ADMIN);
    await addAssociationMember(
      associationId,
      editor.id,
      AssociationRole.EDITOR,
    );

    // Tokens
    ownerToken = await loginUser('e2e.0@test.com', 'Password123!');
    adminToken = await loginUser('e2e.1@test.com', 'Password123!');
    editorToken = await loginUser('e2e.2@test.com', 'Password123!');
    outsiderToken = await loginUser('e2e.3@test.com', 'Password123!');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // POST /associations/:associationId/missions
  // ===========================================================================
  describe('POST /associations/:associationId/missions', () => {
    it('✅ 201 — owner crée une mission ACTIVE', async () => {
      const res = await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(VALID_MISSION_PAYLOAD)
        .expect(201);

      const body = res.body as {
        id: number;
        title: string;
        status: string;
        type: string;
      };
      expect(body.id).toBeDefined();
      expect(body.title).toBe(VALID_MISSION_PAYLOAD.title);
      expect(body.status).toBe('ACTIVE');
      expect(body.type).toBe('MISSION');
    });

    it('✅ 201 — editor peut créer une mission', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(VALID_MISSION_PAYLOAD)
        .expect(201);
    });

    it('✅ 201 — admin peut créer une mission', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(VALID_MISSION_PAYLOAD)
        .expect(201);
    });

    it('✅ 201 — mission de type INFO sans modalité', async () => {
      const res = await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Information importante',
          description:
            'Ceci est une information sans modalité de disponibilité.',
          type: 'INFO',
          hasRegistration: false,
        })
        .expect(201);

      expect(res.body.type).toBe('INFO');
    });

    it('✅ 201 — mission ON_SITE avec adresse', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          ...VALID_MISSION_PAYLOAD,
          availabilityType: 'ON_SITE',
          address: {
            street: '10 rue de la Paix',
            postalCode: '75001',
            city: 'Paris',
          },
        })
        .expect(201);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .send(VALID_MISSION_PAYLOAD)
        .expect(401);
    });

    it('❌ 403 — outsider non-membre', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send(VALID_MISSION_PAYLOAD)
        .expect(403);
    });

    it('❌ 400 — titre trop court', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...VALID_MISSION_PAYLOAD, title: 'AB' })
        .expect(400);
    });

    it('❌ 400 — description trop courte', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...VALID_MISSION_PAYLOAD, description: 'Trop court.' })
        .expect(400);
    });

    it('❌ 400 — MISSION sans availabilityType', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { availabilityType: _at, ...noAvail } = VALID_MISSION_PAYLOAD;
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(noAvail)
        .expect(400);
    });

    it('❌ 400 — ON_SITE sans adresse', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...VALID_MISSION_PAYLOAD, availabilityType: 'ON_SITE' })
        .expect(400);
    });

    it('❌ 400 — INFO avec availabilityType fourni', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Info invalide',
          description: 'Description suffisamment longue pour la validation.',
          type: 'INFO',
          availabilityType: 'REMOTE',
        })
        .expect(400);
    });

    it('❌ 400 — endDate antérieure à startDate', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/missions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          ...VALID_MISSION_PAYLOAD,
          startDate: '2025-06-15T00:00:00.000Z',
          endDate: '2025-06-01T00:00:00.000Z',
        })
        .expect(400);
    });

    it('❌ 403 — association non validée', async () => {
      // Créer une autre association non validée
      const otherOwner = await createTestUser(4);
      const pendingAssoc = await prisma.association.create({
        data: {
          name: 'Asso Pending',
          object: 'Objet',
          legalStatus: 'Loi 1901',
          rna: 'W000000001',
          status: AssociationStatus.PENDING,
          members: {
            create: { userId: otherOwner.id, role: AssociationRole.OWNER },
          },
        },
      });
      const otherToken = await loginUser(`e2e.4@test.com`, 'Password123!');

      await request(httpServer)
        .post(`/associations/${pendingAssoc.id}/missions`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(VALID_MISSION_PAYLOAD)
        .expect(403);
    });
  });

  // ===========================================================================
  // GET /associations/:associationId/missions/dashboard
  // ===========================================================================
  describe('GET /associations/:associationId/missions/dashboard', () => {
    it('✅ 200 — retourne le dashboard avec les 4 onglets', async () => {
      await createTestMission(associationId, { title: 'Mission active' });

      const res = await request(httpServer)
        .get(`/associations/${associationId}/missions/dashboard`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        missions: {
          active: unknown[];
          upcoming: unknown[];
          past: unknown[];
          archived: unknown[];
        };
        counts: {
          active: number;
          upcoming: number;
          past: number;
          archived: number;
        };
      };
      expect(body.missions).toBeDefined();
      expect(body.counts).toBeDefined();
      expect(typeof body.counts.active).toBe('number');
      expect(body.counts.active).toBeGreaterThanOrEqual(1);
    });

    it('✅ 200 — editor peut accéder au dashboard', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/dashboard`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);
    });

    it('✅ 200 — dashboard vide si aucune mission', async () => {
      const res = await request(httpServer)
        .get(`/associations/${associationId}/missions/dashboard`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { counts: { active: number } };
      expect(body.counts.active).toBe(0);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/dashboard`)
        .expect(401);
    });

    it('❌ 403 — outsider non-membre', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/dashboard`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });
  });

  // ===========================================================================
  // GET /associations/:associationId/missions/:missionId
  // ===========================================================================
  describe('GET /associations/:associationId/missions/:missionId', () => {
    let missionId: number;

    beforeEach(async () => {
      const mission = await createTestMission(associationId, {
        title: 'Mission détail E2E',
      });
      missionId = mission.id;
    });

    it('✅ 200 — retourne le détail complet de la mission', async () => {
      const res = await request(httpServer)
        .get(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        id: number;
        title: string;
        status: string;
        participantsCount: number;
        causes: unknown[];
        skills: unknown[];
      };
      expect(body.id).toBe(missionId);
      expect(body.title).toBe('Mission détail E2E');
      expect(body.status).toBe('ACTIVE');
      expect(typeof body.participantsCount).toBe('number');
      expect(Array.isArray(body.causes)).toBe(true);
      expect(Array.isArray(body.skills)).toBe(true);
    });

    it('✅ 200 — editor peut consulter le détail', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/${missionId}`)
        .expect(401);
    });

    it('❌ 403 — outsider non-membre', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 404 — mission inexistante', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/missions/99999`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('❌ 404 — mission appartenant à une autre association', async () => {
      const otherOwner = await createTestUser(5);
      const otherAssoc = await createTestAssociation(otherOwner.id);
      const otherMission = await createTestMission(otherAssoc.id);

      await request(httpServer)
        .get(`/associations/${associationId}/missions/${otherMission.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  // ===========================================================================
  // PATCH /associations/:associationId/missions/:missionId
  // ===========================================================================
  describe('PATCH /associations/:associationId/missions/:missionId', () => {
    let missionId: number;

    beforeEach(async () => {
      const mission = await createTestMission(associationId, {
        title: 'Mission à modifier',
      });
      missionId = mission.id;
    });

    it('✅ 200 — owner met à jour le titre', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Titre mis à jour' })
        .expect(200);

      expect(res.body.title).toBe('Titre mis à jour');
    });

    it('✅ 200 — editor peut mettre à jour', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Titre mis à jour par editor' })
        .expect(200);

      expect(res.body.title).toBe('Titre mis à jour par editor');
    });

    it('✅ 200 — met à jour la description seule', async () => {
      const newDesc =
        'Nouvelle description suffisamment longue pour passer la validation Zod.';
      const res = await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ description: newDesc })
        .expect(200);

      expect(res.body.description).toBe(newDesc);
    });

    it('❌ 400 — titre trop court', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'AB' })
        .expect(400);
    });

    it('❌ 400 — availabilityType invalide', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ availabilityType: 'INVALID' })
        .expect(400);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .send({ title: 'Test' })
        .expect(401);
    });

    it('❌ 403 — outsider non-membre', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ title: 'Test' })
        .expect(403);
    });

    it('❌ 422 — mission archivée ne peut pas être modifiée', async () => {
      await prisma.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.ARCHIVED },
      });

      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Titre modifié' })
        .expect(422);
    });
  });

  // ===========================================================================
  // PATCH /associations/:associationId/missions/:missionId/archive
  // ===========================================================================
  describe('PATCH /associations/:associationId/missions/:missionId/archive', () => {
    let missionId: number;

    beforeEach(async () => {
      const mission = await createTestMission(associationId, {
        title: 'Mission à archiver',
      });
      missionId = mission.id;
    });

    it('✅ 200 — owner archive une mission ACTIVE', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.status).toBe('ARCHIVED');
    });

    it('✅ 200 — admin peut archiver', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('❌ 403 — editor ne peut pas archiver', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/archive`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/archive`)
        .expect(401);
    });

    it('❌ 403 — outsider', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/archive`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 422 — mission déjà archivée', async () => {
      await prisma.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.ARCHIVED },
      });

      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(422);
    });
  });

  // ===========================================================================
  // PATCH /associations/:associationId/missions/:missionId/unarchive
  // ===========================================================================
  describe('PATCH /associations/:associationId/missions/:missionId/unarchive', () => {
    let missionId: number;

    beforeEach(async () => {
      const mission = await createTestMission(associationId, {
        title: 'Mission à désarchiver',
        status: MissionStatus.ARCHIVED,
      });
      missionId = mission.id;
    });

    it('✅ 200 — owner désarchive une mission ARCHIVED', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/unarchive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
    });

    it('✅ 200 — admin peut désarchiver', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/unarchive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('❌ 403 — editor ne peut pas désarchiver', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/missions/${missionId}/unarchive`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);
    });

    it('❌ 422 — mission déjà active ne peut pas être désarchivée', async () => {
      const activeMission = await createTestMission(associationId, {
        title: 'Mission active non archivée',
        status: MissionStatus.ACTIVE,
      });

      await request(httpServer)
        .patch(
          `/associations/${associationId}/missions/${activeMission.id}/unarchive`,
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(422);
    });
  });

  // ===========================================================================
  // DELETE /associations/:associationId/missions/:missionId
  // ===========================================================================
  describe('DELETE /associations/:associationId/missions/:missionId', () => {
    let missionId: number;

    beforeEach(async () => {
      const mission = await createTestMission(associationId, {
        title: 'Mission à supprimer',
      });
      missionId = mission.id;
    });

    it('✅ 204 — owner supprime une mission sans participants', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // Vérification : la mission est bien DELETED en base
      const deleted = await prisma.mission.findUnique({
        where: { id: missionId },
      });
      expect(deleted?.status).toBe(MissionStatus.DELETED);
    });

    it('❌ 403 — admin ne peut pas supprimer (OWNER uniquement)', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('❌ 403 — editor ne peut pas supprimer', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);
    });

    it('❌ 401 — sans token', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/missions/${missionId}`)
        .expect(401);
    });

    it('❌ 403 — outsider non-membre', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 422 — mission archivée ne peut pas être supprimée', async () => {
      await prisma.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.ARCHIVED },
      });

      await request(httpServer)
        .delete(`/associations/${associationId}/missions/${missionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(422);
    });

    it('❌ 404 — mission introuvable', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/missions/99999`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
