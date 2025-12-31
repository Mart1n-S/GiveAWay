import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';
import { cleanDatabase, prisma } from './prisma-test-helper';
import { UserStatus, TokenType } from '../src/generated/prisma/client';
import { App } from 'supertest/types';

// Typage de la réponse API pour éviter les erreurs 'any'
interface ResponseBody {
  message?: string;
  backendTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  email?: string;
}

const userDto = {
  email: 'e2e@test.com',
  password: 'Password123!',
  confirmPassword: 'Password123!', // Nécessaire pour le DTO Register
  firstName: 'John',
  lastName: 'Doe',
  age: 25,
  acceptTerms: true,
  address: {
    street: '10 rue E2E',
    postalCode: '75000',
    city: 'Paris',
    latitude: 48.85,
    longitude: 2.35,
  },
};

describe('Auth Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App; // Typé avec l'interface de Supertest

  // 1. Initialisation de l'application (comme dans main.ts)
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // IMPORTANT : On doit activer le parser de cookies pour que les tests Login fonctionnent
    app.use(cookieParser());
    await app.init();

    // app.getHttpServer() renvoie l'instance sous-jacente (Express/Fastify)
    httpServer = app.getHttpServer() as App;
  });

  // 2. Nettoyage de la BDD avant CHAQUE test pour partir d'une feuille blanche
  beforeEach(async () => {
    await cleanDatabase();
  });

  // 3. Fermeture propre à la fin
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // TEST: INSCRIPTION
  // ===========================================================================
  describe('POST /auth/register', () => {
    it('✅ Devrait créer un utilisateur (201)', async () => {
      return request(httpServer)
        .post('/auth/register')
        .send(userDto)
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toBeDefined();
        });
    });

    it("❌ Devrait échouer si l'email existe déjà (409)", async () => {
      // Premier enregistrement
      await request(httpServer).post('/auth/register').send(userDto);

      // Deuxième tentative avec le même email
      return request(httpServer)
        .post('/auth/register')
        .send(userDto)
        .expect(409);
    });

    it('❌ Devrait échouer si les données sont invalides (400 - Zod)', async () => {
      const invalidDto = { ...userDto, email: 'bad-email' };
      return request(httpServer)
        .post('/auth/register')
        .send(invalidDto)
        .expect(400); // Bad Request (validé par ton ZodValidationPipe)
    });
  });

  // ===========================================================================
  // TEST: VÉRIFICATION EMAIL
  // ===========================================================================
  describe('GET /auth/verify', () => {
    it('✅ Devrait valider le compte avec un bon token', async () => {
      // 1. On inscrit l'user
      await request(httpServer).post('/auth/register').send(userDto);

      // 2. Comme on ne reçoit pas le vrai mail, on va chercher l'user en BDD
      // pour créer un token valide manuellement (simuler le lien reçu par mail)
      const user = await prisma.user.findUnique({
        where: { email: userDto.email },
      });
      if (!user) throw new Error('User not found');

      const rawToken = 'mon-token-secret';
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      // On insère le token manuellement via Prisma
      await prisma.token.create({
        data: {
          token: hashedToken,
          type: TokenType.EMAIL_VERIFICATION,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15), // +15 min
        },
      });

      // 3. On appelle la route avec le token brut
      return request(httpServer)
        .get(`/auth/verify?token=${rawToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('succès');
        });
    });
  });
  // ===========================================================================
  // TEST: LOGIN & REFRESH & LOGOUT
  // ===========================================================================
  describe('Session Flows (Login/Refresh/Logout)', () => {
    beforeEach(async () => {
      // 1. On hash le mot de passe manuellement (car Prisma ne le fait pas tout seul)
      const argon2 = await import('argon2');
      const hashedPassword = await argon2.hash(userDto.password);

      // 2. On crée l'utilisateur directement en base de données
      // Cela BYPASSE totalement le Throttle de l'API
      await prisma.user.create({
        data: {
          email: userDto.email,
          password: hashedPassword,
          firstName: userDto.firstName,
          lastName: userDto.lastName,
          age: userDto.age,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(), // Déjà validé
          address: {
            create: {
              street: userDto.address.street,
              postalCode: userDto.address.postalCode,
              city: userDto.address.city,
            },
          },
        },
      });
    });

    it('✅ Login (WEB) : Devrait renvoyer les Cookies et AUCUN token dans le body', async () => {
      const res = await request(httpServer)
        .post('/auth/login')
        .send({ email: userDto.email, password: userDto.password })
        .expect(200);

      const body = res.body as ResponseBody;
      const cookies = res.get('Set-Cookie');

      // 1. Vérification des Cookies (Sécurité Web)
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('access_token'))).toBeTruthy();
      expect(cookies.some((c) => c.includes('refresh_token'))).toBeTruthy();

      // 2. Vérification de l'absence de tokens dans le JSON (Anti-fuite)
      expect(body.backendTokens).toBeUndefined();
      expect(body.message).toBe('Connexion réussie');
    });

    it('✅ Login (MOBILE) : Devrait renvoyer du JSON avec les tokens', async () => {
      const res = await request(httpServer)
        .post('/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: userDto.email, password: userDto.password })
        .expect(200);

      const body = res.body as ResponseBody;

      // Sur mobile, on accepte les tokens dans le body
      expect(body.backendTokens).toBeDefined();
      expect(body.backendTokens?.accessToken).toBeDefined();
      expect(body.backendTokens?.refreshToken).toBeDefined();
    });

    it('✅ Refresh Token : Devrait renouveler les deux cookies', async () => {
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .send({ email: userDto.email, password: userDto.password })
        .expect(200);

      const cookies = loginRes.get('Set-Cookie');

      const res = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      const newCookies = res.get('Set-Cookie');
      expect(newCookies.some((c) => c.includes('access_token'))).toBeTruthy();
      expect(newCookies.some((c) => c.includes('refresh_token'))).toBeTruthy();
    });

    it('✅ Protected Route (/me) : Devrait fonctionner avec le cookie', async () => {
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .send({ email: userDto.email, password: userDto.password })
        .expect(200);

      const cookies = loginRes.get('Set-Cookie');

      const res = await request(httpServer)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      const body = res.body as ResponseBody;
      expect(body.email).toBe(userDto.email);
    });

    it('✅ Logout : Devrait supprimer les deux cookies', async () => {
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .send({ email: userDto.email, password: userDto.password })
        .expect(200);

      const cookies = loginRes.get('Set-Cookie');

      const res = await request(httpServer)
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      const newCookies = res.get('Set-Cookie');
      // On vérifie que les deux cookies sont réinitialisés (vides)
      expect(newCookies.some((c) => c.includes('access_token=;'))).toBeTruthy();
      expect(
        newCookies.some((c) => c.includes('refresh_token=;')),
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEST: RENVOI EMAIL DE VÉRIFICATION
  // ===========================================================================
  describe('POST /auth/resend-verification', () => {
    it("✅ Devrait toujours répondre 201 (Succès) même si l'email n'existe pas", async () => {
      return request(httpServer)
        .post('/auth/resend-verification')
        .send({ email: 'unknown@test.com' })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('un nouveau lien a été envoyé');
        });
    });

    it("✅ Devrait répondre 201 si l'utilisateur est en attente (PENDING)", async () => {
      // 1. On inscrit un utilisateur (il est PENDING par défaut)
      await request(httpServer).post('/auth/register').send(userDto);

      // 2. On demande le renvoi
      return request(httpServer)
        .post('/auth/resend-verification')
        .send({ email: userDto.email })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('un nouveau lien a été envoyé');
        });
    });

    it("❌ Devrait échouer (400) si l'email est mal formé", async () => {
      return request(httpServer)
        .post('/auth/resend-verification')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });
});
