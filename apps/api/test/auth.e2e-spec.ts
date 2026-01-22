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

  // ===========================================================================
  // TEST: DEMANDE DE REINITIALISATION DE MOT DE PASSE
  // ===========================================================================
  describe('POST /auth/forgot-password', () => {
    it("✅ Devrait créer un token en base si l'email existe", async () => {
      // 1. On crée un utilisateur
      await request(httpServer).post('/auth/register').send(userDto);

      // On active le compte manuellement
      // Sinon, la logique métier peut refuser de créer un token pour un compte "PENDING"
      await prisma.user.update({
        where: { email: userDto.email },
        data: { status: UserStatus.ACTIVE },
      });

      // 2. On appelle la route
      await request(httpServer)
        .post('/auth/forgot-password')
        .send({ email: userDto.email })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('envoyé');
        });

      // 3. Vérification en BDD : Un token doit avoir été créé
      const user = await prisma.user.findUnique({
        where: { email: userDto.email },
      });
      const token = await prisma.token.findFirst({
        where: {
          userId: user?.id,
          type: TokenType.PASSWORD_RESET,
        },
      });

      expect(token).toBeDefined();
      expect(token?.token).toBeDefined();
    });

    it("✅ Devrait répondre succès même si l'email n'existe pas (Sécurité)", async () => {
      // Pour éviter l'énumération des emails, on ne renvoie pas d'erreur 404
      return request(httpServer)
        .post('/auth/forgot-password')
        .send({ email: 'unknown-user@test.com' })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('envoyé');
        });
    });

    it("❌ Devrait échouer (400) si l'email est invalide", async () => {
      return request(httpServer)
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  // ===========================================================================
  // TEST: REINITIALISATION DU MOT DE PASSE
  // ===========================================================================
  describe('POST /auth/reset-password', () => {
    const rawToken = 'reset-token-secret-123';
    const newPassword = 'NewPassword123!';

    beforeEach(async () => {
      // 1. On inscrit l'user initial
      await request(httpServer).post('/auth/register').send(userDto);

      const user = await prisma.user.update({
        where: { email: userDto.email },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      // 2. On insère MANUELLEMENT un token de reset valide en BDD
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      await prisma.token.create({
        data: {
          token: hashedToken,
          type: TokenType.PASSWORD_RESET,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15), // +15 min
        },
      });
    });

    it('✅ Devrait changer le mot de passe avec un token valide', async () => {
      // 1. Reset du mot de passe
      await request(httpServer)
        .post('/auth/reset-password')
        .send({
          token: rawToken, // On envoie le token BRUT
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(201); // Succès

      // 2. PREUVE : On essaie de se connecter avec le NOUVEAU mot de passe
      await request(httpServer)
        .post('/auth/login')
        .send({ email: userDto.email, password: newPassword })
        .expect(200); // Doit réussir (car user est ACTIVE)

      // 3. PREUVE : L'ANCIEN mot de passe ne doit plus marcher
      await request(httpServer)
        .post('/auth/login')
        .send({ email: userDto.email, password: userDto.password })
        .expect(401); // Unauthorized
    });

    it('❌ Devrait échouer si le token est invalide ou expiré', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(401);
    });

    it('❌ Devrait échouer si les mots de passe ne correspondent pas', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .send({
          token: rawToken,
          password: newPassword,
          confirmPassword: 'MismatchPassword123!',
        })
        .expect(400); // Erreur de validation Zod
    });

    it('❌ Devrait échouer si le mot de passe est trop faible', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .send({
          token: rawToken,
          password: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400); // Erreur de validation Zod
    });
  });

  // ===========================================================================
  // TEST: GUEST GUARD (Sécurité)
  // ===========================================================================
  describe('Guest Guard Protection', () => {
    let validCookies: string[];

    beforeEach(async () => {
      const guestUser = { ...userDto, email: 'guest-guard@test.com' };

      // 1. Inscription
      await request(httpServer).post('/auth/register').send(guestUser);

      // 2. Vérification de l'email (comme dans les autres tests)
      const user = await prisma.user.findUnique({
        where: { email: guestUser.email },
      });

      if (!user) throw new Error('User not found after registration');

      const rawToken = 'verification-token-guest';
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      await prisma.token.create({
        data: {
          token: hashedToken,
          type: TokenType.EMAIL_VERIFICATION,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
      });

      // 3. Vérifier l'email via l'API
      await request(httpServer)
        .get(`/auth/verify?token=${rawToken}`)
        .expect(200);

      // 4. Connexion
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .send({ email: guestUser.email, password: guestUser.password });

      if (loginRes.status !== 200) {
        throw new Error(
          `Login failed in setup: ${JSON.stringify(loginRes.body)}`,
        );
      }

      validCookies = loginRes.get('Set-Cookie');

      if (!validCookies) {
        throw new Error('No cookies returned from login');
      }
    });

    it('❌ Register : Devrait être interdit (403) si déjà connecté', async () => {
      return request(httpServer)
        .post('/auth/register')
        .set('Cookie', validCookies)
        .send(userDto)
        .expect(403);
    });

    it('❌ Login : Devrait être interdit (403) si déjà connecté', async () => {
      return request(httpServer)
        .post('/auth/login')
        .set('Cookie', validCookies)
        .send({ email: 'guest-guard@test.com', password: userDto.password })
        .expect(403);
    });

    it('❌ Forgot Password : Devrait être interdit (403) si déjà connecté', async () => {
      return request(httpServer)
        .post('/auth/forgot-password')
        .set('Cookie', validCookies)
        .send({ email: 'guest-guard@test.com' })
        .expect(403);
    });

    it('❌ Verify Email : Devrait être interdit (403) si déjà connecté', async () => {
      // Pas besoin d'un vrai token valide en BDD, le Guard bloque AVANT le Service
      return request(httpServer)
        .get('/auth/verify?token=any-dummy-token')
        .set('Cookie', validCookies)
        .expect(403);
    });

    it('❌ Resend Verification : Devrait être interdit (403) si déjà connecté', async () => {
      return request(httpServer)
        .post('/auth/resend-verification')
        .set('Cookie', validCookies)
        .send({ email: 'guest-guard@test.com' })
        .expect(403);
    });

    it('❌ Reset Password : Devrait être interdit (403) si déjà connecté', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .set('Cookie', validCookies)
        .send({
          token: 'dummy-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        })
        .expect(403);
    });
  });
});
