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
  message?: string;
  admin?: { id: number; email: string; role: string };
  backendTokens?: { accessToken: string; refreshToken: string };
}

describe('AdminAuthController (E2E)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const ADMIN = {
    email: 'admin.auth@test.com',
    password: 'AdminPass123!',
    firstName: 'Auth',
    lastName: 'Admin',
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
        firstName: ADMIN.firstName,
        lastName: ADMIN.lastName,
        role: AdminRole.ADMIN,
      },
    });
  });

  describe('POST /admin/auth/login', () => {
    it('200 mobile : retourne backendTokens + admin', async () => {
      const res = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      expect(res.status).toBe(200);
      const body = res.body as AuthBody;
      expect(body.backendTokens?.accessToken).toBeDefined();
      expect(body.admin?.email).toBe(ADMIN.email);
    });

    it('200 web : pose des cookies httpOnly admin_*', async () => {
      const res = await request(httpServer)
        .post('/admin/auth/login')
        .send({ email: ADMIN.email, password: ADMIN.password });
      expect(res.status).toBe(200);
      const setCookies = res.get('Set-Cookie') as unknown as
        | string[]
        | undefined;
      expect(setCookies?.some((c) => c.startsWith('admin_access_token='))).toBe(
        true,
      );
      expect(
        setCookies?.some((c) => c.startsWith('admin_refresh_token=')),
      ).toBe(true);
    });

    it('401 si mot de passe incorrect', async () => {
      const res = await request(httpServer)
        .post('/admin/auth/login')
        .send({ email: ADMIN.email, password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('400 si email invalide (Zod)', async () => {
      const res = await request(httpServer)
        .post('/admin/auth/login')
        .send({ email: 'pas-un-email', password: 'x' });
      expect(res.status).toBe(400);
    });

    it('met à jour lastLoginAt après connexion', async () => {
      const before = await prisma.admin.findUniqueOrThrow({
        where: { email: ADMIN.email },
      });
      expect(before.lastLoginAt).toBeNull();
      await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const after = await prisma.admin.findUniqueOrThrow({
        where: { email: ADMIN.email },
      });
      expect(after.lastLoginAt).not.toBeNull();
    });
  });

  describe('GET /admin/auth/me', () => {
    it('200 avec token valide', async () => {
      const login = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const token = (login.body as AuthBody).backendTokens.accessToken;

      const res = await request(httpServer)
        .get('/admin/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const body = res.body as { admin: { email: string } };
      expect(body.admin.email).toBe(ADMIN.email);
    });

    it('401 sans token', async () => {
      const res = await request(httpServer).get('/admin/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /admin/auth/refresh', () => {
    it('200 mobile : rotation du refresh token (ancien hash supprimé en BDD)', async () => {
      const login = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const refreshToken = (login.body as AuthBody).backendTokens.refreshToken;
      const initial = await prisma.adminRefreshToken.findFirstOrThrow();

      const res = await request(httpServer)
        .post('/admin/auth/refresh')
        .set('x-client-type', 'mobile')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({});
      expect(res.status).toBe(200);
      const body = res.body as AuthBody;
      expect(body.backendTokens?.accessToken).toBeDefined();

      // L'enregistrement du refresh token initial a été remplacé par un nouveau.
      const stored = await prisma.adminRefreshToken.findMany();
      expect(stored.length).toBe(1);
      expect(stored[0].id).not.toBe(initial.id);
    });

    it('401 si refresh token absent', async () => {
      const res = await request(httpServer)
        .post('/admin/auth/refresh')
        .send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /admin/auth/logout', () => {
    it('200 + supprime le refresh token correspondant', async () => {
      const login = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const body = login.body as AuthBody;

      const before = await prisma.adminRefreshToken.count();
      expect(before).toBe(1);

      const res = await request(httpServer)
        .post('/admin/auth/logout')
        .set('Authorization', `Bearer ${body.backendTokens.accessToken}`)
        .send({ refreshToken: body.backendTokens.refreshToken });
      expect(res.status).toBe(200);

      const after = await prisma.adminRefreshToken.count();
      expect(after).toBe(0);
    });
  });

  describe('POST /admin/auth/change-password', () => {
    it('400 si mot de passe actuel incorrect', async () => {
      const login = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const token = (login.body as AuthBody).backendTokens.accessToken;

      const res = await request(httpServer)
        .post('/admin/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong', newPassword: 'NewPassword123!' });
      expect(res.status).toBe(400);
    });

    it('400 si nouveau mot de passe trop faible (Zod)', async () => {
      const login = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const token = (login.body as AuthBody).backendTokens.accessToken;

      const res = await request(httpServer)
        .post('/admin/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: ADMIN.password, newPassword: 'court' });
      expect(res.status).toBe(400);
    });

    it('200 OK : connexion avec nouveau mot de passe + ancien rejeté', async () => {
      const login = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: ADMIN.password });
      const token = (login.body as AuthBody).backendTokens.accessToken;

      const res = await request(httpServer)
        .post('/admin/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: ADMIN.password,
          newPassword: 'NewPassword123!',
        });
      expect(res.status).toBe(200);

      const newLogin = await request(httpServer)
        .post('/admin/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: ADMIN.email, password: 'NewPassword123!' });
      expect(newLogin.status).toBe(200);

      const oldLogin = await request(httpServer)
        .post('/admin/auth/login')
        .send({ email: ADMIN.email, password: ADMIN.password });
      expect(oldLogin.status).toBe(401);

      const updated = await prisma.admin.findUniqueOrThrow({
        where: { email: ADMIN.email },
      });
      expect(updated.mustChangePassword).toBe(false);
    });
  });
});
