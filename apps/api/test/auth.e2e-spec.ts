import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';
import { FILE_SERVICE } from '../src/common/files/interfaces/file-service.interface';
import { cleanDatabase, prisma } from './prisma-test-helper';
import { UserStatus, TokenType } from '../src/generated/prisma/client';
import { App } from 'supertest/types';
import * as fs from 'fs';
import * as path from 'path';

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

// Interface pour les réponses d'erreur standard de NestJS
interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
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

const mockFileService = {
  // On simule un succès immédiat avec une URL bidon
  uploadFile: jest.fn().mockResolvedValue({
    publicId: 'giveaway/avatars/mock_image_id',
    url: 'https://mock-url/demo/image/upload/mock.jpg',
  }),
  // On simule une suppression immédiate
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

// Fonction pour créer un fichier image temporaire
const createTempImageFile = (): string => {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const tempFilePath = path.join(tempDir, 'test-avatar.jpg');

  // Créer un fichier JPEG minimal (signature JPEG valide)
  const jpegBuffer = Buffer.alloc(1024);
  jpegBuffer[0] = 0xff;
  jpegBuffer[1] = 0xd8;
  jpegBuffer[2] = 0xff;
  jpegBuffer[3] = 0xe0;

  fs.writeFileSync(tempFilePath, jpegBuffer);
  return tempFilePath;
};

// Fonction pour créer un fichier PDF temporaire (pour test d'erreur)
const createTempPdfFile = (): string => {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const tempFilePath = path.join(tempDir, 'test-dummy.pdf');
  const pdfBuffer = Buffer.from('%PDF-1.4\n%Fake PDF for test');

  fs.writeFileSync(tempFilePath, pdfBuffer);
  return tempFilePath;
};

// Fonction pour nettoyer les fichiers temporaires
const cleanTempFiles = () => {
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

describe('Auth Module (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;
  let tempImagePath: string;
  let tempPdfPath: string;

  // 1. Initialisation de l'application (comme dans main.ts)
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_SERVICE) // On cible le token du service
      .useValue(mockFileService) // On le remplace par notre faux objet
      .compile();

    app = moduleFixture.createNestApplication();

    // IMPORTANT : On doit activer le parser de cookies pour que les tests Login fonctionnent
    app.use(cookieParser());
    await app.init();

    // app.getHttpServer() renvoie l'instance sous-jacente (Express/Fastify)
    httpServer = app.getHttpServer() as App;

    // Créer les fichiers temporaires
    tempImagePath = createTempImageFile();
    tempPdfPath = createTempPdfFile();
  });

  // 2. Nettoyage de la BDD avant CHAQUE test pour partir d'une feuille blanche
  beforeEach(async () => {
    await cleanDatabase();
    // Réinitialiser les mocks
    mockFileService.uploadFile.mockClear();
    mockFileService.deleteFile.mockClear();
  });

  // 3. Fermeture propre à la fin
  afterAll(async () => {
    cleanTempFiles(); // Nettoyer les fichiers temporaires
    await app.close();
    await prisma.$disconnect();
  });

  // Fonction helper pour forcer le mimetype
  const sendRegisterWithFakeMimetype = (
    data: typeof userDto,
    fileBuffer: Buffer,
    filename: string,
    fakeMimetype: string,
  ) => {
    return request(httpServer)
      .post('/auth/register')
      .field('email', data.email)
      .field('password', data.password)
      .field('confirmPassword', data.confirmPassword)
      .field('firstName', data.firstName)
      .field('lastName', data.lastName)
      .field('age', data.age.toString())
      .field('acceptTerms', data.acceptTerms.toString())
      .field('address', JSON.stringify(data.address))
      .attach('profilePicture', fileBuffer, {
        filename: filename,
        contentType: fakeMimetype, // On force le mimetype malicieux
      });
  };

  /**
   * Helper générique pour envoyer une requête d'inscription
   * @param data - Données utilisateur
   * @param filePath - Chemin du fichier à uploader (optionnel)
   */
  const sendRegisterRequest = (data: typeof userDto, filePath?: string) => {
    const req = request(httpServer)
      .post('/auth/register')
      .field('email', data.email)
      .field('password', data.password)
      .field('confirmPassword', data.confirmPassword)
      .field('firstName', data.firstName)
      .field('lastName', data.lastName)
      .field('age', data.age.toString())
      .field('acceptTerms', data.acceptTerms.toString())
      .field('address', JSON.stringify(data.address));

    if (filePath) {
      req.attach('profilePicture', filePath);
    }

    return req;
  };

  /**
   * Helper pour envoyer avec un buffer et forcer le mimetype
   */
  const sendRegisterWithBuffer = (
    data: typeof userDto,
    fileBuffer: Buffer,
    filename: string,
    mimetype?: string,
  ) => {
    const req = request(httpServer)
      .post('/auth/register')
      .field('email', data.email)
      .field('password', data.password)
      .field('confirmPassword', data.confirmPassword)
      .field('firstName', data.firstName)
      .field('lastName', data.lastName)
      .field('age', data.age.toString())
      .field('acceptTerms', data.acceptTerms.toString())
      .field('address', JSON.stringify(data.address));

    if (mimetype) {
      req.attach('profilePicture', fileBuffer, {
        filename,
        contentType: mimetype,
      });
    } else {
      req.attach('profilePicture', fileBuffer, filename);
    }

    return req;
  };

  /**
   * Helper pour créer et uploader un fichier temporaire
   */
  const createTempFileAndUpload = async (
    data: typeof userDto,
    buffer: Buffer,
    filename: string,
  ) => {
    const tempPath = path.join(__dirname, 'temp', filename);
    fs.writeFileSync(tempPath, buffer);

    const response = await sendRegisterRequest(data, tempPath);

    fs.unlinkSync(tempPath);
    return response;
  };

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

    it('✅ Devrait créer un utilisateur avec photo de profil (201)', async () => {
      const userWithImage = { ...userDto, email: 'image@test.com' };

      return sendRegisterRequest(userWithImage, tempImagePath)
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toBeDefined();

          // Vérifier que le service d'upload a bien été appelé
          expect(mockFileService.uploadFile).toHaveBeenCalledWith(
            expect.objectContaining({
              fieldname: 'profilePicture',
              originalname: 'test-avatar.jpg',
              mimetype: 'image/jpeg',

              buffer: expect.any(Buffer),
            }),
            'avatars',
          );
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

    it('❌ Devrait échouer si le format du fichier est invalide (422)', async () => {
      const pdfUserDto = { ...userDto, email: 'pdf@test.com' };

      return sendRegisterRequest(pdfUserDto, tempPdfPath)
        .expect(422)
        .expect((res: request.Response) => {
          const body = res.body as ErrorResponseBody;
          expect(body.message).toBe(
            'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés.',
          );
        });
    });

    it("❌ Devrait échouer si l'image est trop volumineuse (422)", async () => {
      const largeFileBuffer = Buffer.alloc(6 * 1024 * 1024);
      largeFileBuffer[0] = 0xff;
      largeFileBuffer[1] = 0xd8;
      largeFileBuffer[2] = 0xff;

      const heavyUserDto = { ...userDto, email: 'heavy@test.com' };

      const response = await createTempFileAndUpload(
        heavyUserDto,
        largeFileBuffer,
        'large.jpg',
      );

      const body = response.body as ErrorResponseBody;
      expect(response.status).toBe(422);
      expect(body.message).toContain("L'image est trop volumineuse");
      expect(body.message).toContain('Max 5 Mo');
    });

    it('❌ Devrait rejeter un fichier vide (422)', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const emptyDto = { ...userDto, email: 'empty@test.com' };

      const response = await createTempFileAndUpload(
        emptyDto,
        emptyBuffer,
        'empty.jpg',
      );

      expect(response.status).toBe(422);
    });

    it('❌ Devrait rejeter fichier avec signature corrompue (422)', async () => {
      const corruptedBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const corruptedDto = { ...userDto, email: 'corrupted@test.com' };

      const response = await createTempFileAndUpload(
        corruptedDto,
        corruptedBuffer,
        'corrupted.jpg',
      );

      expect(response.status).toBe(422);
    });

    it('🔒 Devrait rejeter un .exe renommé en .jpg (422)', async () => {
      const fakeExeBuffer = Buffer.alloc(1024);
      fakeExeBuffer[0] = 0x4d; // 'M'
      fakeExeBuffer[1] = 0x5a; // 'Z'

      const hackerDto = { ...userDto, email: 'hacker@test.com' };

      const response = await createTempFileAndUpload(
        hackerDto,
        fakeExeBuffer,
        'malicious.jpg',
      );

      const body = response.body as ErrorResponseBody;
      expect(response.status).toBe(422);
      expect(body.message).toBe(
        'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés.',
      );
      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
    });

    it('🔒 Devrait rejeter .exe avec mimetype falsifié (422)', async () => {
      const executableBuffer = Buffer.alloc(1024);
      executableBuffer[0] = 0x4d;
      executableBuffer[1] = 0x5a;

      const hackerDto = { ...userDto, email: 'mimetype-spoof@test.com' };

      const response = await sendRegisterWithBuffer(
        hackerDto,
        executableBuffer,
        'innocent.jpg',
        'image/jpeg', // Mimetype falsifié
      );

      const body = response.body as ErrorResponseBody;
      expect(response.status).toBe(422);
      expect(body.message).toBe(
        'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés.',
      );
      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
    });

    it('🔒 SÉCURITÉ - Devrait rejeter .exe avec Content-Type: image/jpeg (422)', async () => {
      // 1. Créer un buffer EXE de taille réaliste (au moins 1 KB)
      const executableBuffer = Buffer.alloc(1024); // 1 KB

      // Ajouter la signature EXE au début
      executableBuffer[0] = 0x4d; // 'M'
      executableBuffer[1] = 0x5a; // 'Z'

      // Remplir le reste avec des données aléatoires (simuler un vrai EXE)
      for (let i = 2; i < 1024; i++) {
        executableBuffer[i] = Math.floor(Math.random() * 256);
      }

      const hackerDto = { ...userDto, email: 'mimetype-spoof@test.com' };

      // 2. Envoyer avec mimetype JPEG falsifié
      const response = await sendRegisterWithFakeMimetype(
        hackerDto,
        executableBuffer,
        'innocent.jpg',
        'image/jpeg', // Mimetype falsifié
      );

      const body = response.body as ErrorResponseBody;

      // 3. Vérifications
      expect(response.status).toBe(422);
      expect(body.message).toBe(
        'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés.',
      );
      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
    });

    it('🔒 SÉCURITÉ - Devrait accepter JPEG valide même avec payload après (201)', async () => {
      // 1. Créer un JPEG valide avec du "code" ajouté après
      const validJpegHeader = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0, // Signature JPEG
        0x00,
        0x10,
        0x4a,
        0x46, // JFIF
        0x49,
        0x46,
        0x00,
        0x01,
      ]);

      // 2. Ajouter du "code malicieux" après (en pratique inoffensif car non exécuté)
      const maliciousPayload = Buffer.from('<?php system($_GET["cmd"]); ?>');

      const polyglotBuffer = Buffer.concat([validJpegHeader, maliciousPayload]);

      const tempPolyglotPath = path.join(__dirname, 'temp', 'polyglot.jpg');
      fs.writeFileSync(tempPolyglotPath, polyglotBuffer);

      const userWithImage = { ...userDto, email: 'polyglot@test.com' };

      const response = await sendRegisterRequest(
        userWithImage,
        tempPolyglotPath,
      );
      fs.unlinkSync(tempPolyglotPath);

      // 3. Ce fichier DOIT être accepté (c'est un vrai JPEG)
      // Le payload n'est pas exécuté car Cloudinary va le re-encoder
      expect(response.status).toBe(201);
    });
  });

  // ===========================================================================
  // TEST: VÉRIFICATION EMAIL
  // ===========================================================================
  describe('POST /auth/verify', () => {
    it('✅ Devrait valider le compte avec un code OTP valide', async () => {
      // 1. Inscription de l'utilisateur
      await request(httpServer).post('/auth/register').send(userDto);

      // 2. Récupération de l'utilisateur pour lier le token
      const user = await prisma.user.findUnique({
        where: { email: userDto.email },
      });
      if (!user) throw new Error('User not found');

      // 3. Création manuelle d'un code OTP (ex: 123456)
      const otpCode = '123456';
      const hashedToken = crypto
        .createHash('sha256')
        .update(otpCode)
        .digest('hex');

      // On insère le code dans la table Token (ou VerificationCode selon ton schéma)
      await prisma.token.create({
        data: {
          token: hashedToken,
          type: TokenType.EMAIL_VERIFICATION,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15), // Valide 15 min
        },
      });

      // 4. Appel de la route en POST avec le DTO (code)
      return request(httpServer)
        .post('/auth/verify') // Changement de GET à POST
        .send({ code: otpCode }) // Envoi du body au lieu du query param
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          // Vérifie le message selon ce que renvoie ton AuthService.verifyEmail
          expect(body.message).toMatch(/succès|activé/i);
        });
    });

    it('❌ Devrait échouer avec un code OTP incorrect', async () => {
      await request(httpServer).post('/auth/register').send(userDto);

      return request(httpServer)
        .post('/auth/verify')
        .send({ code: '000000' }) // Mauvais code
        .expect(400)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toMatch(/invalide|incorrect/i);
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

      // On récupère l'user pour avoir son ID
      const userBefore = await prisma.user.findUnique({
        where: { email: userDto.email },
      });

      // On active le compte manuellement ET on nettoie le token de vérification
      // pour éviter la collision de hash avec le futur token de reset
      await prisma.$transaction([
        prisma.user.update({
          where: { email: userDto.email },
          data: { status: UserStatus.ACTIVE },
        }),
        prisma.token.deleteMany({
          where: { userId: userBefore?.id },
        }),
      ]);

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
    const rawCode = '123456';
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
        .update(rawCode)
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
          code: rawCode, // On envoie le token BRUT
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
        .expect(400);
    });

    it('❌ Devrait échouer si le token est invalide ou expiré', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(400);
    });

    it('❌ Devrait échouer si les mots de passe ne correspondent pas', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .send({
          code: rawCode,
          password: newPassword,
          confirmPassword: 'MismatchPassword123!',
        })
        .expect(400); // Erreur de validation Zod
    });

    it('❌ Devrait échouer si le mot de passe est trop faible', async () => {
      return request(httpServer)
        .post('/auth/reset-password')
        .send({
          code: rawCode,
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

      // 2. Récupération de l'utilisateur pour lier le code OTP
      const user = await prisma.user.findUnique({
        where: { email: guestUser.email },
      });

      if (!user) throw new Error('User not found after registration');

      // 3. Création manuelle du code OTP dans la base
      const otpCode = '999999'; // Code simple pour le setup

      const hashedToken = crypto
        .createHash('sha256')
        .update(otpCode)
        .digest('hex');

      await prisma.token.create({
        data: {
          token: hashedToken,
          type: TokenType.EMAIL_VERIFICATION,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
      });

      // 4. Vérification de l'email via l'API (POST)
      await request(httpServer)
        .post('/auth/verify')
        .send({ code: otpCode }) // On envoie le code dans le body
        .expect(200);

      // 5. Connexion pour récupérer les cookies de session
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
      return request(httpServer)
        .post('/auth/verify')
        .set('Cookie', validCookies)
        .send({ code: '123456' })
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

  // ===========================================================================
  // TEST: CHANGEMENT DE MOT DE PASSE (Web & Mobile)
  // ===========================================================================
  describe('POST /auth/change-password', () => {
    const oldPassword = 'OldPassword123!';
    const newPassword = 'NewPassword123!';
    const testEmail = 'change-pwd-flow@test.com';

    // On recrée un utilisateur "propre" avant chaque test
    beforeEach(async () => {
      // 1. Hashage manuel
      const argon2 = await import('argon2');
      const hashedPassword = await argon2.hash(oldPassword);

      // 2. Création directe en BDD (Bypass Register API)
      await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          firstName: 'Tester',
          lastName: 'Pwd',
          age: 30,
          status: UserStatus.ACTIVE, // Important : Active direct
          emailVerifiedAt: new Date(), // Important : Email validé direct
          address: {
            create: {
              street: 'Pwd St',
              postalCode: '00000',
              city: 'TestCity',
            },
          },
        },
      });
    });

    it('✅ WEB : Devrait changer le mot de passe et vider les cookies', async () => {
      // 1. Login WEB (pour avoir les cookies)
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .send({ email: testEmail, password: oldPassword })
        .expect(200);

      const cookies = loginRes.get('Set-Cookie');

      // 2. Changement de mot de passe (via Cookie)
      const res = await request(httpServer)
        .post('/auth/change-password')
        .set('Cookie', cookies)
        .send({
          oldPassword: oldPassword,
          newPassword: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // 3. Vérification : Les cookies doivent être supprimés (Déconnexion forcée)
      const newCookies = res.get('Set-Cookie');
      expect(newCookies).toBeDefined();

      // On vérifie que le cookie est vidé (Max-Age=0 ou valeur vide)
      expect(JSON.stringify(newCookies)).toContain('access_token=;');
      expect(JSON.stringify(newCookies)).toContain('refresh_token=;');
    });

    it('✅ MOBILE : Devrait fonctionner avec un Bearer Token', async () => {
      // 1. Login MOBILE (pour avoir le token JSON)
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .set('x-client-type', 'mobile')
        .send({ email: testEmail, password: oldPassword })
        .expect(200);

      const body = loginRes.body as ResponseBody;

      // Vérification stricte pour satisfaire TypeScript
      if (!body.backendTokens || !body.backendTokens.accessToken) {
        throw new Error('Access Token non reçu lors du login mobile');
      }

      const accessToken = body.backendTokens.accessToken;

      // 2. Changement de mot de passe (via Header Authorization)
      await request(httpServer)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: oldPassword,
          newPassword: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // Note : Sur mobile, on ignore les Set-Cookie de la réponse,
      // c'est le client mobile qui supprimera son token localement suite au 200 OK.
    });

    it("❌ Erreur : Devrait refuser si l'ancien mot de passe est faux", async () => {
      // On se connecte juste pour avoir une session valide
      const loginRes = await request(httpServer)
        .post('/auth/login')
        .send({ email: testEmail, password: oldPassword });

      const cookies = loginRes.get('Set-Cookie');

      // Tentative avec mauvais ancien mot de passe
      return request(httpServer)
        .post('/auth/change-password')
        .set('Cookie', cookies)
        .send({
          oldPassword: 'WrongPassword!!!',
          newPassword: newPassword,
          confirmPassword: newPassword,
        })
        .expect(400);
    });
  });
});
