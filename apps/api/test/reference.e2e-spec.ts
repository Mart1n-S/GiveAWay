import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { prisma } from './prisma-test-helper';
import { App } from 'supertest/types';

// ----------------------------------------------------------------
// Suite E2E — Module Reference
//
// Toutes les routes /reference/* sont publiques (pas d'authentification).
// Ces tests vérifient :
//   1. Le statut HTTP 200
//   2. Que la réponse est un tableau (même vide)
//   3. La structure des éléments retournés si le tableau est non-vide
//
// Les données de référence (skills, causes, etc.) sont peuplées via
// le seed de la base de test et ne sont PAS supprimées par cleanDatabase.
// ----------------------------------------------------------------

describe('Reference Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;

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

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // GET /reference/skills
  // ===========================================================================
  describe('GET /reference/skills', () => {
    it('✅ 200 — route publique accessible sans authentification', async () => {
      await request(httpServer).get('/reference/skills').expect(200);
    });

    it('✅ 200 — retourne un tableau', async () => {
      const res = await request(httpServer)
        .get('/reference/skills')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('✅ 200 — chaque élément possède les champs id et label', async () => {
      const res = await request(httpServer)
        .get('/reference/skills')
        .expect(200);
      const body = res.body as unknown[];

      if (body.length > 0) {
        const first = body[0] as { id: number; label: string };
        expect(typeof first.id).toBe('number');
        expect(typeof first.label).toBe('string');
        // Ne doit pas exposer d'autres champs inattendus
        expect(Object.keys(first).sort()).toEqual(['id', 'label']);
      }
    });

    it('✅ 200 — les compétences sont triées alphabétiquement', async () => {
      const res = await request(httpServer)
        .get('/reference/skills')
        .expect(200);
      const body = res.body as Array<{ label: string }>;

      if (body.length > 1) {
        for (let i = 0; i < body.length - 1; i++) {
          expect(
            body[i].label.localeCompare(body[i + 1].label),
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  // ===========================================================================
  // GET /reference/causes
  // ===========================================================================
  describe('GET /reference/causes', () => {
    it('✅ 200 — route publique accessible sans authentification', async () => {
      await request(httpServer).get('/reference/causes').expect(200);
    });

    it('✅ 200 — retourne un tableau', async () => {
      const res = await request(httpServer)
        .get('/reference/causes')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('✅ 200 — chaque élément possède les champs id et label', async () => {
      const res = await request(httpServer)
        .get('/reference/causes')
        .expect(200);
      const body = res.body as unknown[];

      if (body.length > 0) {
        const first = body[0] as { id: number; label: string };
        expect(typeof first.id).toBe('number');
        expect(typeof first.label).toBe('string');
        expect(Object.keys(first).sort()).toEqual(['id', 'label']);
      }
    });

    it('✅ 200 — les causes sont triées alphabétiquement', async () => {
      const res = await request(httpServer)
        .get('/reference/causes')
        .expect(200);
      const body = res.body as Array<{ label: string }>;

      if (body.length > 1) {
        for (let i = 0; i < body.length - 1; i++) {
          expect(
            body[i].label.localeCompare(body[i + 1].label),
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  // ===========================================================================
  // GET /reference/association-categories
  // ===========================================================================
  describe('GET /reference/association-categories', () => {
    it('✅ 200 — route publique accessible sans authentification', async () => {
      await request(httpServer)
        .get('/reference/association-categories')
        .expect(200);
    });

    it('✅ 200 — retourne un tableau', async () => {
      const res = await request(httpServer)
        .get('/reference/association-categories')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('✅ 200 — chaque élément possède les champs id et name', async () => {
      const res = await request(httpServer)
        .get('/reference/association-categories')
        .expect(200);
      const body = res.body as unknown[];

      if (body.length > 0) {
        const first = body[0] as { id: number; name: string };
        expect(typeof first.id).toBe('number');
        expect(typeof first.name).toBe('string');
        // Les catégories d'associations utilisent 'name' et non 'label'
        expect(Object.keys(first).sort()).toEqual(['id', 'name']);
      }
    });

    it('✅ 200 — les catégories sont triées alphabétiquement', async () => {
      const res = await request(httpServer)
        .get('/reference/association-categories')
        .expect(200);
      const body = res.body as Array<{ name: string }>;

      if (body.length > 1) {
        for (let i = 0; i < body.length - 1; i++) {
          expect(
            body[i].name.localeCompare(body[i + 1].name),
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  // ===========================================================================
  // GET /reference/public-types
  // ===========================================================================
  describe('GET /reference/public-types', () => {
    it('✅ 200 — route publique accessible sans authentification', async () => {
      await request(httpServer).get('/reference/public-types').expect(200);
    });

    it('✅ 200 — retourne un tableau', async () => {
      const res = await request(httpServer)
        .get('/reference/public-types')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('✅ 200 — chaque élément possède les champs id et label', async () => {
      const res = await request(httpServer)
        .get('/reference/public-types')
        .expect(200);
      const body = res.body as unknown[];

      if (body.length > 0) {
        const first = body[0] as { id: number; label: string };
        expect(typeof first.id).toBe('number');
        expect(typeof first.label).toBe('string');
        expect(Object.keys(first).sort()).toEqual(['id', 'label']);
      }
    });

    it('✅ 200 — les types de publics sont triés alphabétiquement', async () => {
      const res = await request(httpServer)
        .get('/reference/public-types')
        .expect(200);
      const body = res.body as Array<{ label: string }>;

      if (body.length > 1) {
        for (let i = 0; i < body.length - 1; i++) {
          expect(
            body[i].label.localeCompare(body[i + 1].label),
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  // ===========================================================================
  // GET /reference/volunteer-types
  // ===========================================================================
  describe('GET /reference/volunteer-types', () => {
    it('✅ 200 — route publique accessible sans authentification', async () => {
      await request(httpServer).get('/reference/volunteer-types').expect(200);
    });

    it('✅ 200 — retourne un tableau', async () => {
      const res = await request(httpServer)
        .get('/reference/volunteer-types')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('✅ 200 — chaque élément possède les champs id et label', async () => {
      const res = await request(httpServer)
        .get('/reference/volunteer-types')
        .expect(200);
      const body = res.body as unknown[];

      if (body.length > 0) {
        const first = body[0] as { id: number; label: string };
        expect(typeof first.id).toBe('number');
        expect(typeof first.label).toBe('string');
        expect(Object.keys(first).sort()).toEqual(['id', 'label']);
      }
    });

    it('✅ 200 — les types de bénévoles sont triés alphabétiquement', async () => {
      const res = await request(httpServer)
        .get('/reference/volunteer-types')
        .expect(200);
      const body = res.body as Array<{ label: string }>;

      if (body.length > 1) {
        for (let i = 0; i < body.length - 1; i++) {
          expect(
            body[i].label.localeCompare(body[i + 1].label),
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });
});
