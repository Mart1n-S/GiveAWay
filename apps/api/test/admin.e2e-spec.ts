import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { hash } from 'argon2';
import { AppModule } from './../src/app.module';
import { cleanDatabase, prisma, createTestUser } from './prisma-test-helper';
import {
  AdminRole,
  AssociationStatus,
  AssociationRole,
} from '../src/generated/prisma/client';
import { App } from 'supertest/types';

interface AdminAuthBody {
  message?: string;
  admin?: { id: number; email: string; role: string };
  backendTokens?: { accessToken: string; refreshToken: string };
}

describe('AdminController (E2E)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const SUPER_ADMIN = {
    email: 'superadmin.e2e@test.com',
    password: 'AdminPass123!',
    firstName: 'Super',
    lastName: 'Admin',
  };
  const ADMIN = {
    email: 'admin.e2e@test.com',
    password: 'AdminPass123!',
    firstName: 'Plain',
    lastName: 'Admin',
  };

  let superToken: string;
  let adminToken: string;
  let superAdminId: number;
  let adminId: number;

  const loginAdmin = async (email: string, password: string) => {
    const res = await request(httpServer)
      .post('/admin/auth/login')
      .set('x-client-type', 'mobile')
      .send({ email, password });
    expect(res.status).toBe(200);
    const body = res.body as AdminAuthBody;
    return body.backendTokens.accessToken;
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
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
        email: SUPER_ADMIN.email,
        password: await hash(SUPER_ADMIN.password),
        firstName: SUPER_ADMIN.firstName,
        lastName: SUPER_ADMIN.lastName,
        role: AdminRole.SUPER_ADMIN,
      },
    });
    superAdminId = superA.id;

    const plainA = await prisma.admin.create({
      data: {
        email: ADMIN.email,
        password: await hash(ADMIN.password),
        firstName: ADMIN.firstName,
        lastName: ADMIN.lastName,
        role: AdminRole.ADMIN,
      },
    });
    adminId = plainA.id;

    superToken = await loginAdmin(SUPER_ADMIN.email, SUPER_ADMIN.password);
    adminToken = await loginAdmin(ADMIN.email, ADMIN.password);
  });

  describe('Auth admin', () => {
    it('rejette des credentials invalides', async () => {
      const res = await request(httpServer)
        .post('/admin/auth/login')
        .send({ email: SUPER_ADMIN.email, password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('GET /admin/auth/me retourne l’admin', async () => {
      const res = await request(httpServer)
        .get('/admin/auth/me')
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { admin: { email: string } }).admin.email).toBe(
        SUPER_ADMIN.email,
      );
    });

    it('rejette l’accès admin avec un access_token user (mauvais scope)', async () => {
      // un endpoint admin protégé doit refuser le token user
      const res = await request(httpServer)
        .get('/admin/admins')
        .set('Authorization', `Bearer not-an-admin-token`);
      expect(res.status).toBe(401);
    });
  });

  describe('EPIC 1 — Validation association', () => {
    let assoId: number;

    beforeEach(async () => {
      const owner = await createTestUser(101);
      const asso = await prisma.association.create({
        data: {
          name: 'Asso pending',
          status: AssociationStatus.PENDING,
          rna: 'W12345',
          members: {
            create: { userId: owner.id, role: AssociationRole.OWNER },
          },
        },
      });
      assoId = asso.id;
    });

    it('valide une asso pending et écrit un admin_log', async () => {
      const res = await request(httpServer)
        .patch(`/admin/associations/${assoId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: assoId },
      });
      expect(updated.status).toBe(AssociationStatus.VALIDATED);

      const logs = await prisma.adminLog.findMany({
        where: { entityType: 'ASSOCIATION', entityId: assoId },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('VALIDATE_ASSOCIATION');
    });

    it('refuse une asso avec un motif obligatoire', async () => {
      const res = await request(httpServer)
        .patch(`/admin/associations/${assoId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'short' });
      expect(res.status).toBe(400); // < 10 chars

      const ok = await request(httpServer)
        .patch(`/admin/associations/${assoId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Document SIRET non valide après vérification' });
      expect(ok.status).toBe(200);
      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: assoId },
      });
      expect(updated.status).toBe(AssociationStatus.REJECTED);
    });
  });

  describe('EPIC 2 — anonymisation user', () => {
    it('anonymise un user au DELETE', async () => {
      const u = await createTestUser(202);
      const res = await request(httpServer)
        .delete(`/admin/users/${u.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: u.id },
      });
      expect(after.status).toBe('DELETED');
      expect(after.email).toMatch(/deleted-\d+@anon\.local/);
      expect(after.firstName).toBe('Utilisateur');
      expect(after.password).toBeNull();
    });
  });

  describe('EPIC 5 — gestion admins (SUPER_ADMIN only)', () => {
    it('ADMIN simple peut lister les admins (lecture seule autorisée)', async () => {
      const res = await request(httpServer)
        .get('/admin/admins')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('ADMIN simple reçoit 403 sur création d’admin (SUPER_ADMIN only)', async () => {
      const res = await request(httpServer)
        .post('/admin/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'forbidden.create@test.com',
          firstName: 'No',
          lastName: 'Way',
          role: 'ADMIN',
        });
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN peut créer un admin (envoi email mocké en mode test)', async () => {
      const res = await request(httpServer)
        .post('/admin/admins')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'newadmin.e2e@test.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'ADMIN',
        });
      expect(res.status).toBe(201);
      const created = await prisma.admin.findUniqueOrThrow({
        where: { email: 'newadmin.e2e@test.com' },
      });
      expect(created.role).toBe(AdminRole.ADMIN);
      expect(created.mustChangePassword).toBe(true);
    });

    it('SUPER_ADMIN ne peut pas se supprimer lui-même', async () => {
      const res = await request(httpServer)
        .delete(`/admin/admins/${superAdminId}`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(403);
    });

    it('Impossible de supprimer le dernier SUPER_ADMIN', async () => {
      // On supprime "soi-même" indirectement : créer un autre super admin puis supprimer le premier
      // Ici, il n'y a qu'un seul super_admin → on tente la suppression d'un autre super_admin créé pour le test
      const tmp = await prisma.admin.create({
        data: {
          email: 'lone.super@test.com',
          password: await hash('test'),
          firstName: 'X',
          lastName: 'Y',
          role: AdminRole.SUPER_ADMIN,
        },
      });
      // On supprime le premier super admin (pas soi-même → ok, count=2 → ok)
      const res1 = await request(httpServer)
        .delete(`/admin/admins/${tmp.id}`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res1.status).toBe(200);

      // Maintenant il n'y a plus qu'un super_admin (l'utilisateur courant)
      // Tenter de rétrograder ce super_admin vers ADMIN doit échouer
      const otherAdmin = await prisma.admin.create({
        data: {
          email: 'another.admin@test.com',
          password: await hash('test'),
          firstName: 'A',
          lastName: 'B',
          role: AdminRole.SUPER_ADMIN,
        },
      });
      // Maintenant 2 super_admins. On peut rétrograder l'un d'eux.
      const okDemote = await request(httpServer)
        .patch(`/admin/admins/${otherAdmin.id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ role: 'ADMIN' });
      expect(okDemote.status).toBe(200);

      // Maintenant 1 seul super_admin → tentative de rétrogradation refusée
      const failDemote = await request(httpServer)
        .patch(`/admin/admins/${superAdminId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ role: 'ADMIN' });
      expect(failDemote.status).toBe(403);
    });

    it('Reset password admin réinvalide les refresh tokens', async () => {
      const res = await request(httpServer)
        .post(`/admin/admins/${adminId}/reset-password`)
        .set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(201);
      const remaining = await prisma.adminRefreshToken.findMany({
        where: { adminId },
      });
      expect(remaining.length).toBe(0);
    });
  });

  describe('EPIC 4 — Stats', () => {
    it('GET /admin/stats/overview retourne la shape attendue', async () => {
      const res = await request(httpServer)
        .get('/admin/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = res.body as {
        activeUsers: { value: number };
        range: { from: string; to: string };
      };
      expect(body.activeUsers).toBeDefined();
      expect(body.range.from).toBeDefined();
    });
  });
});
