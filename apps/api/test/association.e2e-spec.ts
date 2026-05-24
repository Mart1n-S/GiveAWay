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
  createTestAssociationWithAddress,
  addAssociationMember,
  createTestMission,
} from './prisma-test-helper';
import { AssociationRole } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

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
// Mock du FileService (évite les appels Cloudinary/local)
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Suite E2E
// ----------------------------------------------------------------

describe('Association Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;

  // IDs créés avant chaque test
  let ownerUserId: number;
  let memberUserId: number;
  let outsiderUserId: number;
  let associationId: number;
  let memberAssocUserId: number; // id de l'AssociationUser du membre

  // JWT tokens
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  // ----------------------------------------------------------------
  // Helper — login via l'API (mobile, retourne token dans le body)
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // Setup / Teardown
  // ----------------------------------------------------------------

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

    // Créer 3 utilisateurs (owner, membre, outsider)
    const ownerUser = await createTestUser(0);
    const memberUser = await createTestUser(1);
    const outsiderUser = await createTestUser(2);

    ownerUserId = ownerUser.id;
    memberUserId = memberUser.id;
    outsiderUserId = outsiderUser.id;

    // Créer l'association avec l'owner
    const assoc = await createTestAssociation(ownerUserId);
    associationId = assoc.id;

    // Ajouter le membre (EDITOR)
    const assocUser = await addAssociationMember(
      associationId,
      memberUserId,
      AssociationRole.EDITOR,
    );
    memberAssocUserId = assocUser.id;

    // Login des 3 utilisateurs
    ownerToken = await loginUser(`e2e.w0@test.com`, 'Password123!');
    memberToken = await loginUser(`e2e.w1@test.com`, 'Password123!');
    outsiderToken = await loginUser(`e2e.w2@test.com`, 'Password123!');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // GET /associations/nearby
  // ===========================================================================
  describe('GET /associations/nearby', () => {
    it('✅ 200 — retourne un tableau vide si aucune association dans le rayon', async () => {
      const res = await request(httpServer)
        .get('/associations/nearby')
        .query({ lat: 48.85, lng: 2.35, radius: 5 })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('✅ 200 — retourne les associations géolocalisées dans le rayon', async () => {
      // Créer une association avec des coordonnées à Paris
      await createTestAssociationWithAddress(ownerUserId, 48.85, 2.35);

      const res = await request(httpServer)
        .get('/associations/nearby')
        .query({ lat: 48.85, lng: 2.35, radius: 10 })
        .expect(200);

      const body = res.body as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);

      const firstItem = body[0] as {
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        city: string;
      };
      expect(firstItem.id).toBeDefined();
      expect(firstItem.name).toBeDefined();
      expect(typeof firstItem.latitude).toBe('number');
      expect(typeof firstItem.longitude).toBe('number');
    });

    it("✅ 200 — n'inclut pas les associations hors du rayon", async () => {
      // Créer une association à Lyon (~400km de Tokyo)
      await createTestAssociationWithAddress(ownerUserId, 45.74, 4.83);

      // Chercher autour de Tokyo (très loin de Lyon)
      const res = await request(httpServer)
        .get('/associations/nearby')
        .query({ lat: 35.68, lng: 139.69, radius: 10 })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBe(0);
    });

    it('❌ 400 — lat manquant', async () => {
      await request(httpServer)
        .get('/associations/nearby')
        .query({ lng: 2.35, radius: 10 })
        .expect(400);
    });

    it('❌ 400 — lng manquant', async () => {
      await request(httpServer)
        .get('/associations/nearby')
        .query({ lat: 48.85, radius: 10 })
        .expect(400);
    });

    it('❌ 400 — lat invalide (non numérique)', async () => {
      await request(httpServer)
        .get('/associations/nearby')
        .query({ lat: 'invalid', lng: 2.35, radius: 10 })
        .expect(400);
    });

    it('❌ 400 — rayon supérieur à 50km (max autorisé)', async () => {
      await request(httpServer)
        .get('/associations/nearby')
        .query({ lat: 48.85, lng: 2.35, radius: 100 })
        .expect(400);
    });
  });

  // ===========================================================================
  // GET /associations/:associationId
  // ===========================================================================
  describe('GET /associations/:associationId', () => {
    it('✅ 200 — retourne le profil complet pour un membre', async () => {
      const res = await request(httpServer)
        .get(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        id: number;
        name: string;
        members: unknown[];
      };
      expect(body.id).toBe(associationId);
      expect(body.name).toBe('Association E2E Test [w0]');
      expect(Array.isArray(body.members)).toBe(true);
    });

    it('✅ 200 — accessible pour un membre EDITOR', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}`)
        .expect(401);
    });

    it("❌ 403 — utilisateur non-membre de l'association", async () => {
      await request(httpServer)
        .get(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 403 — association inexistante (garde membership avant le service)', async () => {
      // Le AssociationMemberGuard retourne 403 avant d'atteindre le service :
      // l'utilisateur ne peut pas être membre d'une association qui n'existe pas.
      await request(httpServer)
        .get(`/associations/99999`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  // ===========================================================================
  // PATCH /associations/:associationId
  // ===========================================================================
  describe('PATCH /associations/:associationId', () => {
    it('✅ 200 — mise à jour réussie par le OWNER', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ description: 'Nouvelle description de test' })
        .expect(200);

      const body = res.body as { description: string };
      expect(body.description).toBe('Nouvelle description de test');
    });

    it('✅ 200 — mise à jour avec une nouvelle adresse', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          address: {
            street: '5 avenue de Lyon',
            postalCode: '69001',
            city: 'Lyon',
          },
        })
        .expect(200);

      const body = res.body as { address: { city: string } };
      expect(body.address?.city).toBe('Lyon');
    });

    it("❌ 403 — un EDITOR ne peut pas mettre à jour l'association", async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ description: 'Tentative non autorisée' })
        .expect(403);
    });

    it("❌ 403 — un non-membre ne peut pas mettre à jour l'association", async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ description: 'Tentative non autorisée' })
        .expect(403);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}`)
        .send({ description: 'Test' })
        .expect(401);
    });

    it('❌ 400 — données invalides (nom trop court)', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'A' })
        .expect(400);
    });
  });

  // ===========================================================================
  // GET /associations/:associationId/members
  // ===========================================================================
  describe('GET /associations/:associationId/members', () => {
    it('✅ 200 — retourne la liste des membres pour un membre', async () => {
      const res = await request(httpServer)
        .get(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2); // owner + member
    });

    it('❌ 403 — non-membre ne peut pas voir les membres', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .get(`/associations/${associationId}/members`)
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /associations/missions/:associationId
  // ===========================================================================
  describe('GET /associations/missions/:associationId', () => {
    it('✅ 200 — retourne une liste vide si aucune mission', async () => {
      const res = await request(httpServer)
        .get(`/associations/missions/${associationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        missions: unknown[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
      expect(Array.isArray(body.missions)).toBe(true);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.totalPages).toBe(0);
    });

    it("✅ 200 — retourne les missions de l'association", async () => {
      await createTestMission(associationId, { title: 'Mission test A' });
      await createTestMission(associationId, { title: 'Mission test B' });

      const res = await request(httpServer)
        .get(`/associations/missions/${associationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { missions: unknown[]; total: number };
      expect(body.total).toBe(2);
      expect(body.missions).toHaveLength(2);
    });

    it('✅ 200 — supporte la pagination (page et pageSize)', async () => {
      await createTestMission(associationId, { title: 'Mission A' });
      await createTestMission(associationId, { title: 'Mission B' });
      await createTestMission(associationId, { title: 'Mission C' });

      const res = await request(httpServer)
        .get(`/associations/missions/${associationId}`)
        .query({ page: 1, pageSize: 2 })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        missions: unknown[];
        total: number;
        pageSize: number;
        totalPages: number;
      };
      expect(body.missions).toHaveLength(2);
      expect(body.total).toBe(3);
      expect(body.totalPages).toBe(2);
    });

    it('✅ 200 — accessible pour un membre EDITOR', async () => {
      await request(httpServer)
        .get(`/associations/missions/${associationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('❌ 403 — non-membre ne peut pas voir les missions', async () => {
      await request(httpServer)
        .get(`/associations/missions/${associationId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .get(`/associations/missions/${associationId}`)
        .expect(401);
    });
  });

  // ===========================================================================
  // POST /associations/:associationId/members
  // ===========================================================================
  describe('POST /associations/:associationId/members', () => {
    it('✅ 201 — le OWNER peut ajouter un membre par email', async () => {
      // Créer un utilisateur qui n'est pas encore membre
      const newUser = await createTestUser(3);

      const res = await request(httpServer)
        .post(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `e2e.w3@test.com` })
        .expect(201);

      const body = res.body as { userId: number; role: string };
      expect(body.userId).toBe(newUser.id);
      expect(body.role).toBe(AssociationRole.EDITOR);
    });

    it('✅ 201 — un ADMIN peut ajouter un membre', async () => {
      // Promouvoir le membre EDITOR en ADMIN
      await prisma.associationUser.update({
        where: { id: memberAssocUserId },
        data: { role: AssociationRole.ADMIN },
      });
      await createTestUser(4);

      await request(httpServer)
        .post(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: `e2e.w4@test.com` })
        .expect(201);
    });

    it('❌ 403 — un EDITOR ne peut pas ajouter un membre', async () => {
      await createTestUser(5);

      await request(httpServer)
        .post(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: `e2e.w5@test.com` })
        .expect(403);
    });

    it('❌ 404 — email inconnu', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'inexistant@nowhere.com' })
        .expect(404);
    });

    it('❌ 409 — utilisateur déjà membre', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `e2e.w1@test.com` })
        .expect(409);
    });

    it('❌ 400 — email invalide', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'pas-un-email' })
        .expect(400);
    });
  });

  // ===========================================================================
  // PATCH /associations/:associationId/members/:memberId
  // ===========================================================================
  describe('PATCH /associations/:associationId/members/:memberId', () => {
    it('✅ 200 — le OWNER peut changer le rôle EDITOR → ADMIN', async () => {
      const res = await request(httpServer)
        .patch(`/associations/${associationId}/members/${memberAssocUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      const body = res.body as { role: string };
      expect(body.role).toBe('ADMIN');
    });

    it("❌ 403 — un EDITOR ne peut pas changer le rôle d'un autre membre", async () => {
      // Récupérer le membre OWNER
      const ownerAssocUser = await prisma.associationUser.findFirst({
        where: { associationId, userId: ownerUserId },
      });

      await request(httpServer)
        .patch(`/associations/${associationId}/members/${ownerAssocUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it("❌ 403 — impossible de changer le rôle de l'OWNER via cette route", async () => {
      const ownerAssocUser = await prisma.associationUser.findFirst({
        where: { associationId, userId: ownerUserId },
      });

      await request(httpServer)
        .patch(`/associations/${associationId}/members/${ownerAssocUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('❌ 400 — rôle OWNER interdit via cette route (validation DTO)', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/members/${memberAssocUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'OWNER' })
        .expect(400);
    });

    it('❌ 404 — membre introuvable', async () => {
      await request(httpServer)
        .patch(`/associations/${associationId}/members/99999`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'ADMIN' })
        .expect(404);
    });
  });

  // ===========================================================================
  // DELETE /associations/:associationId/members/:memberId
  // ===========================================================================
  describe('DELETE /associations/:associationId/members/:memberId', () => {
    it('✅ 204 — le OWNER peut retirer un membre', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/members/${memberAssocUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // Vérifier que le membre a bien été supprimé
      const deleted = await prisma.associationUser.findFirst({
        where: { id: memberAssocUserId },
      });
      expect(deleted).toBeNull();
    });

    it('❌ 403 — un EDITOR ne peut pas retirer un autre membre', async () => {
      const ownerAssocUser = await prisma.associationUser.findFirst({
        where: { associationId, userId: ownerUserId },
      });

      await request(httpServer)
        .delete(`/associations/${associationId}/members/${ownerAssocUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it("❌ 403 — impossible de retirer l'OWNER", async () => {
      const ownerAssocUser = await prisma.associationUser.findFirst({
        where: { associationId, userId: ownerUserId },
      });

      await request(httpServer)
        .delete(`/associations/${associationId}/members/${ownerAssocUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('❌ 404 — membre introuvable', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/members/99999`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/members/${memberAssocUserId}`)
        .expect(401);
    });
  });

  // ===========================================================================
  // DELETE /associations/:associationId/leave
  // ===========================================================================
  describe('DELETE /associations/:associationId/leave', () => {
    it("✅ 204 — un EDITOR peut quitter l'association", async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/leave`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(204);

      // Vérifier que le membre a bien été retiré
      const deleted = await prisma.associationUser.findFirst({
        where: { id: memberAssocUserId },
      });
      expect(deleted).toBeNull();
    });

    it("✅ 204 — un ADMIN peut quitter l'association", async () => {
      // Promouvoir le membre EDITOR en ADMIN
      await prisma.associationUser.update({
        where: { id: memberAssocUserId },
        data: { role: AssociationRole.ADMIN },
      });

      await request(httpServer)
        .delete(`/associations/${associationId}/leave`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(204);
    });

    it("❌ 403 — l'OWNER ne peut pas quitter (doit d'abord transférer la propriété)", async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/leave`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('❌ 403 — un non-membre ne peut pas quitter (guard membership)', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/leave`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .delete(`/associations/${associationId}/leave`)
        .expect(401);
    });
  });

  // ===========================================================================
  // POST /associations/:associationId/transfer-owner
  // ===========================================================================
  describe('POST /associations/:associationId/transfer-owner', () => {
    it('✅ 200 — le OWNER peut transférer la propriété à un membre', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/transfer-owner`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerUserId: memberUserId })
        .expect(200);

      // Vérifier que les rôles ont été inversés en base
      const newOwner = await prisma.associationUser.findFirst({
        where: { associationId, userId: memberUserId },
      });
      const oldOwner = await prisma.associationUser.findFirst({
        where: { associationId, userId: ownerUserId },
      });

      expect(newOwner?.role).toBe(AssociationRole.OWNER);
      expect(oldOwner?.role).toBe(AssociationRole.ADMIN);
    });

    it('❌ 403 — un EDITOR ne peut pas transférer la propriété', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/transfer-owner`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ newOwnerUserId: outsiderUserId })
        .expect(403);
    });

    it('❌ 400 — impossible de se transférer la propriété à soi-même', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/transfer-owner`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerUserId: ownerUserId })
        .expect(400);
    });

    it("❌ 404 — l'utilisateur cible n'est pas membre", async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/transfer-owner`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerUserId: outsiderUserId })
        .expect(404);
    });

    it('❌ 400 — newOwnerUserId invalide (chaîne)', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/transfer-owner`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerUserId: 'pas-un-id' })
        .expect(400);
    });

    it('❌ 401 — sans token JWT', async () => {
      await request(httpServer)
        .post(`/associations/${associationId}/transfer-owner`)
        .send({ newOwnerUserId: memberUserId })
        .expect(401);
    });
  });
});
