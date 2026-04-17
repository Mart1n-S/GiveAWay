import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import {
  cleanDatabase,
  prisma,
  createTestUser,
  createTestAssociation,
  createTestMission,
} from './prisma-test-helper';
import { ActivityType } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

// ----------------------------------------------------------------
// Suite E2E — Module Mission
// Les routes GET /missions sont publiques (pas d'authentification requise).
// ----------------------------------------------------------------

describe('Mission Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;

  let associationId: number;
  let missionId: number;

  // ----------------------------------------------------------------
  // Setup / Teardown
  // ----------------------------------------------------------------

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    httpServer = app.getHttpServer() as App;
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Créer un owner et une association de test
    const owner = await createTestUser(0);
    const assoc = await createTestAssociation(owner.id);
    associationId = assoc.id;

    // Créer une mission ACTIVE avec adresse (pour les tests de carte)
    const mission = await createTestMission(associationId, {
      title: 'Distribution de repas chauds',
      withAddress: true,
      lat: 48.85,
      lng: 2.35,
    });
    missionId = mission.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // GET /missions
  // ===========================================================================
  describe('GET /missions', () => {
    it('✅ 200 — retourne la liste paginée des missions actives', async () => {
      const res = await request(httpServer).get('/missions').expect(200);

      const body = res.body as {
        missions: unknown[];
        total: number;
        page: number;
        pageSize: number;
      };
      expect(Array.isArray(body.missions)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBeDefined();
    });

    it('✅ 200 — retourne la structure correcte pour chaque mission', async () => {
      const res = await request(httpServer).get('/missions').expect(200);

      const body = res.body as {
        missions: Array<{
          id: number;
          title: string;
          type: string;
          association: { name: string };
          causes: unknown[];
          skills: unknown[];
          volunteerTypes: unknown[];
        }>;
      };
      expect(body.missions.length).toBeGreaterThanOrEqual(1);

      const mission = body.missions[0];
      expect(mission.id).toBeDefined();
      expect(mission.title).toBeDefined();
      expect(mission.type).toBeDefined();
      expect(mission.association).toBeDefined();
      expect(Array.isArray(mission.causes)).toBe(true);
      expect(Array.isArray(mission.skills)).toBe(true);
      expect(Array.isArray(mission.volunteerTypes)).toBe(true);
    });

    it('✅ 200 — filtre les missions par type', async () => {
      // Créer une mission de type EVENT
      await createTestMission(associationId, {
        type: ActivityType.EVENT,
        title: 'Événement test',
      });

      // Filtrer sur type MISSION (ne doit pas retourner EVENT)
      const res = await request(httpServer)
        .get('/missions')
        .query({ type: 'MISSION' })
        .expect(200);

      const body = res.body as {
        missions: Array<{ type: string }>;
        total: number;
      };
      body.missions.forEach((m) => expect(m.type).toBe('MISSION'));
    });

    it('✅ 200 — filtre les missions par ville (insensible à la casse)', async () => {
      const res = await request(httpServer)
        .get('/missions')
        .query({ city: 'paris' })
        .expect(200);

      const body = res.body as {
        missions: Array<{ address: { city: string } | null }>;
      };
      // Toutes les missions retournées doivent être à Paris
      body.missions.forEach((m) => {
        if (m.address) {
          expect(m.address.city.toLowerCase()).toContain('paris');
        }
      });
    });

    it('✅ 200 — recherche textuelle dans le titre', async () => {
      const res = await request(httpServer)
        .get('/missions')
        .query({ search: 'Distribution' })
        .expect(200);

      const body = res.body as {
        missions: Array<{ title: string }>;
        total: number;
      };
      expect(body.total).toBeGreaterThanOrEqual(1);
      // Le titre contient le terme de recherche
      const found = body.missions.some((m) =>
        m.title.toLowerCase().includes('distribution'),
      );
      expect(found).toBe(true);
    });

    it('✅ 200 — recherche textuelle sans résultat', async () => {
      const res = await request(httpServer)
        .get('/missions')
        .query({ search: 'TermeInexistantXYZ123' })
        .expect(200);

      const body = res.body as { missions: unknown[]; total: number };
      expect(body.total).toBe(0);
      expect(body.missions).toHaveLength(0);
    });

    it('✅ 200 — pagination : page 1 avec pageSize 1', async () => {
      // Créer une 2e mission
      await createTestMission(associationId, { title: 'Mission 2' });

      const res = await request(httpServer)
        .get('/missions')
        .query({ page: 1, pageSize: 1 })
        .expect(200);

      const body = res.body as {
        missions: unknown[];
        total: number;
        page: number;
        pageSize: number;
      };
      expect(body.missions).toHaveLength(1);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(1);
    });

    it('✅ 200 — pagination : page 2 avec pageSize 1', async () => {
      await createTestMission(associationId, { title: 'Mission 2' });

      const res = await request(httpServer)
        .get('/missions')
        .query({ page: 2, pageSize: 1 })
        .expect(200);

      const body = res.body as { missions: unknown[]; page: number };
      expect(body.missions).toHaveLength(1);
      expect(body.page).toBe(2);
    });

    it('❌ 400 — page invalide (0)', async () => {
      await request(httpServer).get('/missions').query({ page: 0 }).expect(400);
    });

    it('❌ 400 — pageSize invalide (> 100)', async () => {
      await request(httpServer)
        .get('/missions')
        .query({ pageSize: 101 })
        .expect(400);
    });
  });

  // ===========================================================================
  // GET /missions/map
  // ===========================================================================
  describe('GET /missions/map', () => {
    it('✅ 200 — retourne les missions géolocalisées pour la carte', async () => {
      const res = await request(httpServer).get('/missions/map').expect(200);

      const body = res.body as Array<{
        id: number;
        title: string;
        type: string;
        latitude: number;
        longitude: number;
        city: string;
        association: { name: string; logoUrl: string | null };
      }>;
      expect(Array.isArray(body)).toBe(true);
      // Notre mission créée avec withAddress: true doit apparaître
      expect(body.length).toBeGreaterThanOrEqual(1);

      const item = body[0];
      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
      expect(typeof item.latitude).toBe('number');
      expect(typeof item.longitude).toBe('number');
      expect(item.association).toBeDefined();
    });

    it("✅ 200 — n'inclut pas les missions sans adresse géolocalisée", async () => {
      // Créer une mission SANS adresse
      await createTestMission(associationId, {
        title: 'Mission sans localisation',
        withAddress: false,
      });

      const res = await request(httpServer).get('/missions/map').expect(200);
      const body = res.body as Array<{ title: string }>;

      // La mission sans adresse ne doit PAS apparaître dans la carte
      const withoutAddress = body.find(
        (m) => m.title === 'Mission sans localisation',
      );
      expect(withoutAddress).toBeUndefined();
    });

    it('✅ 200 — filtre par type sur la carte', async () => {
      await createTestMission(associationId, {
        type: ActivityType.EVENT,
        title: 'Événement localisé',
        withAddress: true,
      });

      const res = await request(httpServer)
        .get('/missions/map')
        .query({ type: 'EVENT' })
        .expect(200);

      const body = res.body as Array<{ type: string }>;
      body.forEach((m) => expect(m.type).toBe('EVENT'));
    });

    it('✅ 200 — retourne un tableau vide si aucune mission géolocalisée active', async () => {
      // Supprimer toutes les missions créées dans beforeEach
      await prisma.mission.deleteMany({ where: { associationId } });

      const res = await request(httpServer).get('/missions/map').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBe(0);
    });
  });

  // ===========================================================================
  // GET /missions/:id
  // ===========================================================================
  describe('GET /missions/:id', () => {
    it("✅ 200 — retourne le détail complet d'une mission", async () => {
      const res = await request(httpServer)
        .get(`/missions/${missionId}`)
        .expect(200);

      const body = res.body as {
        id: number;
        title: string;
        description: string;
        type: string;
        hasRegistration: boolean;
        participantsCount: number;
        causes: unknown[];
        skills: unknown[];
        volunteerTypes: unknown[];
        publicTypes: unknown[];
        association: { id: number; name: string };
        address: { city: string; latitude: number; longitude: number } | null;
      };
      expect(body.id).toBe(missionId);
      expect(body.title).toBe('Distribution de repas chauds');
      expect(body.description).toBeDefined();
      expect(body.type).toBe('MISSION');
      expect(typeof body.hasRegistration).toBe('boolean');
      expect(typeof body.participantsCount).toBe('number');
      expect(Array.isArray(body.causes)).toBe(true);
      expect(Array.isArray(body.skills)).toBe(true);
      expect(Array.isArray(body.volunteerTypes)).toBe(true);
      expect(Array.isArray(body.publicTypes)).toBe(true);
      expect(body.association).toBeDefined();
    });

    it('✅ 200 — retourne les coordonnées converties en number', async () => {
      const res = await request(httpServer)
        .get(`/missions/${missionId}`)
        .expect(200);

      const body = res.body as {
        address: { latitude: number; longitude: number } | null;
      };
      // La mission a été créée avec withAddress: true
      expect(body.address).not.toBeNull();
      expect(typeof body.address?.latitude).toBe('number');
      expect(typeof body.address?.longitude).toBe('number');
      expect(body.address?.latitude).toBe(48.85);
      expect(body.address?.longitude).toBe(2.35);
    });

    it('❌ 404 — mission inexistante', async () => {
      await request(httpServer).get('/missions/99999').expect(404);
    });

    it('❌ 400 — ID non entier', async () => {
      await request(httpServer).get('/missions/abc').expect(400);
    });

    it('❌ 400 — ID négatif (ParseIntPipe réussit mais mission introuvable)', async () => {
      await request(httpServer).get('/missions/-1').expect(404);
    });
  });
});
