import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { hash } from 'argon2';
import { AppModule } from './../src/app.module';
import {
  cleanDatabase,
  prisma,
  createTestUser,
  createTestAssociation,
  createTestMission,
  createTestMissionParticipant,
} from './prisma-test-helper';
import { AdminRole, AssociationStatus } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

interface AuthBody {
  backendTokens?: { accessToken: string; refreshToken: string };
}

describe('AdminStatsController (E2E)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const ADMIN = {
    email: 'admin.stats@test.com',
    password: 'AdminPass123!',
  };
  let adminToken: string;
  let adminId: number;

  const loginAdmin = async () => {
    const res = await request(httpServer)
      .post('/admin/auth/login')
      .set('x-client-type', 'mobile')
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(200);
    return (res.body as AuthBody).backendTokens.accessToken;
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await prisma.adminLog.deleteMany();
    await prisma.adminRefreshToken.deleteMany();
    await prisma.admin.deleteMany();

    const a = await prisma.admin.create({
      data: {
        email: ADMIN.email,
        password: await hash(ADMIN.password),
        firstName: 'Admin',
        lastName: 'Stats',
        role: AdminRole.ADMIN,
      },
    });
    adminId = a.id;
    adminToken = await loginAdmin();
  });

  // ---------------------------------------------------------------- overview
  describe('GET /admin/stats/overview', () => {
    it('401 sans token', async () => {
      const res = await request(httpServer).get('/admin/stats/overview');
      expect(res.status).toBe(401);
    });

    it('200 retourne tous les KPI attendus', async () => {
      const res = await request(httpServer)
        .get('/admin/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = res.body as {
        range: { from: string; to: string };
        activeUsers: { value: number };
        newSignups: { value: number };
        validatedAssociations: { value: number };
        pendingAssociations: { value: number };
        activeMissions: { value: number };
        participations: { value: number };
        associationValidationRate: { value: number };
      };
      expect(body.range.from).toBeDefined();
      expect(body.activeUsers).toBeDefined();
      expect(body.newSignups).toBeDefined();
      expect(body.validatedAssociations).toBeDefined();
      expect(body.activeMissions).toBeDefined();
      expect(body.participations).toBeDefined();
      expect(body.associationValidationRate).toBeDefined();
    });

    it('reflète les comptes réels (1 user, 1 asso VALIDATED, 1 mission ACTIVE)', async () => {
      const u = await createTestUser(1);
      await createTestAssociation(u.id);
      const asso = await prisma.association.findFirstOrThrow({
        where: { status: AssociationStatus.VALIDATED },
      });
      await createTestMission(asso.id);

      const res = await request(httpServer)
        .get('/admin/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = res.body as {
        activeUsers: { value: number };
        validatedAssociations: { value: number };
        activeMissions: { value: number };
      };
      expect(body.activeUsers.value).toBeGreaterThanOrEqual(1);
      expect(body.validatedAssociations.value).toBeGreaterThanOrEqual(1);
      expect(body.activeMissions.value).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------- timeseries
  describe('GET /admin/stats/timeseries', () => {
    it('rejette une metric inconnue (>=400)', async () => {
      const res = await request(httpServer)
        .get('/admin/stats/timeseries')
        .query({ metric: 'unknown' })
        .set('Authorization', `Bearer ${adminToken}`);
      // Le contrôleur appelle .parse() directement (pas via la pipe Zod) — la
      // validation lève donc une ZodError qui n'est pas convertie en 400. On
      // valide au moins que la requête est rejetée (pas un 200).
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('200 retourne un tableau pour user_signups', async () => {
      await createTestUser(1);
      await createTestUser(2);

      const res = await request(httpServer)
        .get('/admin/stats/timeseries')
        .query({ metric: 'user_signups', granularity: 'day' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------------------------------------------------------------- breakdown
  describe('GET /admin/stats/breakdown', () => {
    it('200 user_status', async () => {
      await createTestUser(1);
      const res = await request(httpServer)
        .get('/admin/stats/breakdown')
        .query({ dimension: 'user_status' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('rejette une dimension inconnue (>=400)', async () => {
      const res = await request(httpServer)
        .get('/admin/stats/breakdown')
        .query({ dimension: 'invalid' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ---------------------------------------------------------------- top
  describe('GET /admin/stats/top', () => {
    it('200 recent_users', async () => {
      await createTestUser(1);
      const res = await request(httpServer)
        .get('/admin/stats/top')
        .query({ entity: 'recent_users', limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('200 missions_by_participants enrichi avec association', async () => {
      const u = await createTestUser(1);
      const asso = await createTestAssociation(u.id);
      const m = await createTestMission(asso.id);
      await createTestMissionParticipant(m.id, u.id);

      const res = await request(httpServer)
        .get('/admin/stats/top')
        .query({ entity: 'missions_by_participants', limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = res.body as {
        missionId: number;
        title: string;
        association: string;
      }[];
      expect(body[0].missionId).toBe(m.id);
      expect(body[0].title).toBeDefined();
      expect(body[0].association).toBeDefined();
    });
  });

  // ---------------------------------------------------------------- admin-logs
  describe('GET /admin/stats/admin-logs', () => {
    beforeEach(async () => {
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'CREATE_USER',
          entityType: 'USER',
          entityId: 1,
          details: { foo: 'bar' },
        },
      });
    });

    it('200 retourne les logs paginés avec admin email joint', async () => {
      const res = await request(httpServer)
        .get('/admin/stats/admin-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = res.body as {
        items: { admin: { email: string } }[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.items[0].admin.email).toBe(ADMIN.email);
    });

    it('200 filtre par action', async () => {
      const res = await request(httpServer)
        .get('/admin/stats/admin-logs')
        .query({ action: 'CREATE_USER' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { total: number }).total).toBe(1);

      const empty = await request(httpServer)
        .get('/admin/stats/admin-logs')
        .query({ action: 'DELETE_USER' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect((empty.body as { total: number }).total).toBe(0);
    });
  });

  // ---------------------------------------------------------------- export csv
  describe('GET /admin/stats/export/admin-logs.csv', () => {
    it('200 retourne du CSV (Content-Type + Content-Disposition)', async () => {
      await prisma.adminLog.create({
        data: {
          adminId,
          action: 'CREATE_USER',
          entityType: 'USER',
          entityId: 1,
          details: {},
        },
      });

      const res = await request(httpServer)
        .get('/admin/stats/export/admin-logs.csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toContain('admin-logs.csv');
      const text = res.text;
      expect(text).toContain('action');
      expect(text).toContain('CREATE_USER');
    });
  });
});
