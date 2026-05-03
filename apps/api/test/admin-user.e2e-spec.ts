import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { hash } from 'argon2';
import { AppModule } from './../src/app.module';
import { cleanDatabase, prisma, createTestUser } from './prisma-test-helper';
import { AdminRole, UserStatus } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

interface AuthBody {
  backendTokens?: { accessToken: string; refreshToken: string };
}

describe('AdminUserController (E2E)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const ADMIN = {
    email: 'admin.user@test.com',
    password: 'AdminPass123!',
  };

  let adminToken: string;

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

    await prisma.admin.create({
      data: {
        email: ADMIN.email,
        password: await hash(ADMIN.password),
        firstName: 'Admin',
        lastName: 'User',
        role: AdminRole.ADMIN,
      },
    });
    adminToken = await loginAdmin();
  });

  describe('GET /admin/users', () => {
    it('liste paginée + filtres', async () => {
      await createTestUser(1);
      await createTestUser(2);

      const res = await request(httpServer)
        .get('/admin/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = res.body as { items: unknown[]; total: number };
      expect(body.total).toBe(2);
    });

    it('filtre par status', async () => {
      const u = await createTestUser(1);
      await prisma.user.update({
        where: { id: u.id },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await request(httpServer)
        .get('/admin/users')
        .query({ status: 'SUSPENDED' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { total: number }).total).toBe(1);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('404 si user introuvable', async () => {
      const res = await request(httpServer)
        .get('/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('200 retourne user avec relations', async () => {
      const u = await createTestUser(1);
      const res = await request(httpServer)
        .get(`/admin/users/${u.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { id: number }).id).toBe(u.id);
    });
  });

  describe('POST /admin/users', () => {
    it('400 si payload invalide (email manquant)', async () => {
      const res = await request(httpServer)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'A',
          lastName: 'B',
          age: 30,
          address: { street: 's', postalCode: '75000', city: 'Paris' },
        });
      expect(res.status).toBe(400);
    });

    it('409 si email déjà utilisé', async () => {
      const u = await createTestUser(1);
      const res = await request(httpServer)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: u.email,
          firstName: 'Aa',
          lastName: 'Bb',
          age: 30,
          address: {
            street: '12 rue de la Paix',
            postalCode: '75000',
            city: 'Paris',
          },
        });
      expect(res.status).toBe(409);
    });

    it('201 crée un user ACTIVE avec emailVerifiedAt', async () => {
      const res = await request(httpServer)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newbie@test.com',
          firstName: 'Newbie',
          lastName: 'User',
          age: 30,
          address: { street: '1 rue', postalCode: '75000', city: 'Paris' },
        });
      expect(res.status).toBe(201);
      const created = await prisma.user.findUniqueOrThrow({
        where: { email: 'newbie@test.com' },
      });
      expect(created.status).toBe(UserStatus.ACTIVE);
      expect(created.emailVerifiedAt).not.toBeNull();
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('met à jour uniquement firstName/lastName/biography', async () => {
      const u = await createTestUser(1);
      const res = await request(httpServer)
        .patch(`/admin/users/${u.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Modéré', biography: 'Bio modérée' });
      expect(res.status).toBe(200);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: u.id },
      });
      expect(after.firstName).toBe('Modéré');
      expect(after.biography).toBe('Bio modérée');
      expect(after.email).toBe(u.email);
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('200 SUSPENDED', async () => {
      const u = await createTestUser(1);
      const res = await request(httpServer)
        .patch(`/admin/users/${u.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Comportement inapproprié' });
      expect(res.status).toBe(200);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: u.id },
      });
      expect(after.status).toBe(UserStatus.SUSPENDED);
    });

    it('400 si status non-autorisé (DELETED)', async () => {
      const u = await createTestUser(1);
      const res = await request(httpServer)
        .patch(`/admin/users/${u.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELETED' });
      expect(res.status).toBe(400);
    });

    it('400 si user déjà DELETED', async () => {
      const u = await createTestUser(1);
      await prisma.user.update({
        where: { id: u.id },
        data: { status: UserStatus.DELETED },
      });
      const res = await request(httpServer)
        .patch(`/admin/users/${u.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /admin/users/:id (anonymisation)', () => {
    it('200 anonymise user (email, firstName, password=null) + écrit log', async () => {
      const u = await createTestUser(1);
      const res = await request(httpServer)
        .delete(`/admin/users/${u.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: u.id },
      });
      expect(after.status).toBe(UserStatus.DELETED);
      expect(after.email).toMatch(/deleted-\d+@anon\.local/);
      expect(after.firstName).toBe('Utilisateur');
      expect(after.password).toBeNull();
      expect(after.deletedAt).not.toBeNull();

      const logs = await prisma.adminLog.findMany({
        where: { action: 'DELETE_USER', entityType: 'USER', entityId: u.id },
      });
      expect(logs.length).toBe(1);
    });

    it('400 si déjà DELETED', async () => {
      const u = await createTestUser(1);
      await prisma.user.update({
        where: { id: u.id },
        data: { status: UserStatus.DELETED },
      });
      const res = await request(httpServer)
        .delete(`/admin/users/${u.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });
});
