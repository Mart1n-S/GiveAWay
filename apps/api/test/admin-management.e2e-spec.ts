import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { hash } from 'argon2';
import { AppModule } from './../src/app.module';
import { cleanDatabase, prisma } from './prisma-test-helper';
import { AdminRole } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

interface AuthBody {
  backendTokens?: { accessToken: string; refreshToken: string };
}

describe('AdminManagementController (E2E)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const SUPER = {
    email: 'super.mgmt@test.com',
    password: 'AdminPass123!',
  };
  const SIMPLE = {
    email: 'admin.mgmt@test.com',
    password: 'AdminPass123!',
  };

  let superToken: string;
  let adminToken: string;
  let superId: number;
  let adminId: number;

  const loginAdmin = async (email: string, password: string) => {
    const res = await request(httpServer)
      .post('/admin/auth/login')
      .set('x-client-type', 'mobile')
      .send({ email, password });
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

    const superA = await prisma.admin.create({
      data: {
        email: SUPER.email,
        password: await hash(SUPER.password),
        firstName: 'Super',
        lastName: 'Mgmt',
        role: AdminRole.SUPER_ADMIN,
      },
    });
    superId = superA.id;

    const simpleA = await prisma.admin.create({
      data: {
        email: SIMPLE.email,
        password: await hash(SIMPLE.password),
        firstName: 'Admin',
        lastName: 'Simple',
        role: AdminRole.ADMIN,
      },
    });
    adminId = simpleA.id;

    superToken = await loginAdmin(SUPER.email, SUPER.password);
    adminToken = await loginAdmin(SIMPLE.email, SIMPLE.password);
  });

  describe('GET /admin/admins', () => {
    it('200 ADMIN simple peut lire (transparence)', async () => {
      const res = await request(httpServer)
        .get('/admin/admins')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBe(2);
    });

    it('GET /admin/admins/:id retourne aussi les logs', async () => {
      const res = await request(httpServer)
        .get(`/admin/admins/${superId}`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(200);
      const body = res.body as { id: number; logs: unknown[] };
      expect(body.id).toBe(superId);
      expect(Array.isArray(body.logs)).toBe(true);
    });
  });

  describe('POST /admin/admins (SUPER_ADMIN only)', () => {
    it('403 si appelé par un ADMIN simple', async () => {
      const res = await request(httpServer)
        .post('/admin/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new@test.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'ADMIN',
        });
      expect(res.status).toBe(403);
    });

    it('409 si email déjà utilisé', async () => {
      const res = await request(httpServer)
        .post('/admin/admins')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: SIMPLE.email,
          firstName: 'New',
          lastName: 'Admin',
          role: 'ADMIN',
        });
      expect(res.status).toBe(409);
    });

    it('400 si rôle invalide (Zod)', async () => {
      const res = await request(httpServer)
        .post('/admin/admins')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'invalid.role@test.com',
          firstName: 'A',
          lastName: 'B',
          role: 'OWNER',
        });
      expect(res.status).toBe(400);
    });

    it('201 SUPER_ADMIN crée un admin (mustChangePassword=true) et écrit un log', async () => {
      const res = await request(httpServer)
        .post('/admin/admins')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'fresh.admin@test.com',
          firstName: 'Fresh',
          lastName: 'Admin',
          role: 'ADMIN',
        });
      expect(res.status).toBe(201);

      const created = await prisma.admin.findUniqueOrThrow({
        where: { email: 'fresh.admin@test.com' },
      });
      expect(created.mustChangePassword).toBe(true);

      const logs = await prisma.adminLog.findMany({
        where: { action: 'CREATE_ADMIN', entityType: 'ADMIN' },
      });
      expect(logs.length).toBe(1);
    });
  });

  describe('PATCH /admin/admins/:id (SUPER_ADMIN only)', () => {
    it('403 ADMIN simple', async () => {
      const res = await request(httpServer)
        .patch(`/admin/admins/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Hack' });
      expect(res.status).toBe(403);
    });

    it('200 met à jour firstName / lastName', async () => {
      const res = await request(httpServer)
        .patch(`/admin/admins/${adminId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ firstName: 'Updated' });
      expect(res.status).toBe(200);
      const updated = await prisma.admin.findUniqueOrThrow({
        where: { id: adminId },
      });
      expect(updated.firstName).toBe('Updated');
    });

    it('403 SUPER_ADMIN tente de se rétrograder lui-même', async () => {
      const res = await request(httpServer)
        .patch(`/admin/admins/${superId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(403);
    });

    it('403 rétrograder le DERNIER super admin (autre que soi)', async () => {
      // Créer un 2e super_admin, supprimer le 1er actuel n'est pas possible
      // (auto-protection) — on rétrograde l'autre super qu'on vient de créer puis on
      // tente de rétrograder le seul restant.
      const tmp = await prisma.admin.create({
        data: {
          email: 'extra.super@test.com',
          password: await hash('x'),
          firstName: 'X',
          lastName: 'Y',
          role: AdminRole.SUPER_ADMIN,
        },
      });
      // 2 super_admins → on peut rétrograder le tmp
      const ok = await request(httpServer)
        .patch(`/admin/admins/${tmp.id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ role: 'ADMIN' });
      expect(ok.status).toBe(200);

      // Plus qu'1 SUPER_ADMIN → impossible de rétrograder superId
      const ko = await request(httpServer)
        .patch(`/admin/admins/${superId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ role: 'ADMIN' });
      expect(ko.status).toBe(403);
    });
  });

  describe('POST /admin/admins/:id/reset-password', () => {
    it('403 ADMIN simple', async () => {
      const res = await request(httpServer)
        .post(`/admin/admins/${adminId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('201 SUPER_ADMIN reset → invalide tous les refresh tokens', async () => {
      // Le user simple s'est déjà loggé : il a un refresh token
      const before = await prisma.adminRefreshToken.findMany({
        where: { adminId },
      });
      expect(before.length).toBe(1);

      const res = await request(httpServer)
        .post(`/admin/admins/${adminId}/reset-password`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(201);

      const after = await prisma.adminRefreshToken.findMany({
        where: { adminId },
      });
      expect(after.length).toBe(0);

      const updated = await prisma.admin.findUniqueOrThrow({
        where: { id: adminId },
      });
      expect(updated.mustChangePassword).toBe(true);
    });
  });

  describe('DELETE /admin/admins/:id (SUPER_ADMIN only)', () => {
    it('403 ADMIN simple', async () => {
      const res = await request(httpServer)
        .delete(`/admin/admins/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('403 SUPER_ADMIN tente de se supprimer lui-même', async () => {
      const res = await request(httpServer)
        .delete(`/admin/admins/${superId}`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(403);
    });

    it('200 SUPER_ADMIN supprime un autre admin', async () => {
      const res = await request(httpServer)
        .delete(`/admin/admins/${adminId}`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(200);
      const after = await prisma.admin.findUnique({ where: { id: adminId } });
      expect(after).toBeNull();
    });
  });
});
