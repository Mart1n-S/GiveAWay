import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { hash } from 'argon2';
import { AppModule } from './../src/app.module';
import { FILE_SERVICE } from '../src/common/files/interfaces/file-service.interface';
import {
  cleanDatabase,
  prisma,
  createTestUser,
  createTestMission,
} from './prisma-test-helper';
import {
  AdminRole,
  AssociationRole,
  AssociationStatus,
  MissionStatus,
} from '../src/generated/prisma/client';
import { App } from 'supertest/types';

interface AdminAuthBody {
  backendTokens?: { accessToken: string; refreshToken: string };
}

const mockFileService = {
  uploadFile: jest.fn().mockResolvedValue({
    publicId: 'mock/admin-doc',
    url: 'https://mock/admin-doc.pdf',
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFileForDownload: jest.fn().mockResolvedValue({
    type: 'redirect',
    url: 'https://mock/admin-doc.pdf',
  }),
};

// Buffer PDF minimal mais valide pour la pipe DocumentsValidationPipe :
// magic number "%PDF" + contenu > 12 octets.
const pdfBuffer = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('contenu du document de test pour pipe.'),
]);

describe('AdminAssociationController (E2E)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const SUPER_ADMIN = {
    email: 'super.assos@test.com',
    password: 'AdminPass123!',
    firstName: 'Super',
    lastName: 'Admin',
  };

  let adminToken: string;
  let ownerUserId: number;

  const loginAdmin = async (email: string, password: string) => {
    const res = await request(httpServer)
      .post('/admin/auth/login')
      .set('x-client-type', 'mobile')
      .send({ email, password });
    expect(res.status).toBe(200);
    return (res.body as AdminAuthBody).backendTokens.accessToken;
  };

  // Crée une asso de test rattachée à un owner.
  const createAsso = async (params: {
    ownerId: number;
    status?: AssociationStatus;
    name?: string;
    rna?: string;
    siret?: string;
  }) => {
    return prisma.association.create({
      data: {
        name: params.name ?? 'Asso E2E',
        rna: params.rna ?? null,
        siret: params.siret ?? null,
        status: params.status ?? AssociationStatus.PENDING,
        members: {
          create: { userId: params.ownerId, role: AssociationRole.OWNER },
        },
      },
    });
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_SERVICE)
      .useValue(mockFileService)
      .compile();

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
    jest.clearAllMocks();

    await cleanDatabase();
    await prisma.adminLog.deleteMany();
    await prisma.adminRefreshToken.deleteMany();
    await prisma.admin.deleteMany();

    await prisma.admin.create({
      data: {
        email: SUPER_ADMIN.email,
        password: await hash(SUPER_ADMIN.password),
        firstName: SUPER_ADMIN.firstName,
        lastName: SUPER_ADMIN.lastName,
        role: AdminRole.SUPER_ADMIN,
      },
    });

    const owner = await createTestUser(0);
    ownerUserId = owner.id;

    adminToken = await loginAdmin(SUPER_ADMIN.email, SUPER_ADMIN.password);
  });

  // ---------------------------------------------------------------- listing
  describe('Listing & détail', () => {
    it('GET /admin/associations/pending → ne retourne que les PENDING', async () => {
      await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.PENDING,
        name: 'Pending 1',
      });
      await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
        name: 'Validated 1',
        rna: 'W22222',
      });

      const res = await request(httpServer)
        .get('/admin/associations/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { items: { name: string }[]; total: number };
      expect(body.total).toBe(1);
      expect(body.items[0].name).toBe('Pending 1');
    });

    it('GET /admin/associations?search=foo → matche name/siret/rna', async () => {
      await createAsso({ ownerId: ownerUserId, name: 'FooBar Asso' });
      await createAsso({ ownerId: ownerUserId, name: 'Autre', rna: 'W11111' });

      const res = await request(httpServer)
        .get('/admin/associations')
        .query({ search: 'foo' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { total: number; items: { name: string }[] };
      expect(body.total).toBe(1);
      expect(body.items[0].name).toBe('FooBar Asso');
    });

    it('GET /admin/associations/:id → 404 si inconnue', async () => {
      const res = await request(httpServer)
        .get('/admin/associations/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------- validate / reject
  describe('Validate / Reject', () => {
    it('PATCH /:id/validate → succès + admin_log', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });

      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: asso.id },
      });
      expect(updated.status).toBe(AssociationStatus.VALIDATED);

      const logs = await prisma.adminLog.findMany({
        where: {
          entityType: 'ASSOCIATION',
          entityId: asso.id,
          action: 'VALIDATE_ASSOCIATION',
        },
      });
      expect(logs.length).toBe(1);
    });

    it('PATCH /:id/validate → 400 si asso déjà VALIDATED', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
      });
      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('PATCH /:id/reject → 400 si motif < 10 chars, 200 sinon', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });

      const ko = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'court' });
      expect(ko.status).toBe(400);

      const ok = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Document SIRET non valide après vérification.' });
      expect(ok.status).toBe(200);

      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: asso.id },
      });
      expect(updated.status).toBe(AssociationStatus.REJECTED);
    });

    it('Re-validation : asso REJECTED peut être validée et perd rejectionReason', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.REJECTED,
      });
      await prisma.association.update({
        where: { id: asso.id },
        data: { rejectionReason: 'old reason' },
      });

      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: asso.id },
      });
      expect(updated.status).toBe(AssociationStatus.VALIDATED);
      expect(updated.rejectionReason).toBeNull();
    });
  });

  // ---------------------------------------------------------------- suspend / reactivate
  describe('Suspend / Reactivate', () => {
    it('PATCH /:id/suspend → archive missions actives', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
      });
      const mission = await createTestMission(asso.id, {
        status: MissionStatus.ACTIVE,
      });

      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Comportement non conforme aux CGU' });
      expect(res.status).toBe(200);

      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: asso.id },
      });
      expect(updated.status).toBe(AssociationStatus.SUSPENDED);

      const m = await prisma.mission.findUniqueOrThrow({
        where: { id: mission.id },
      });
      expect(m.status).toBe(MissionStatus.ARCHIVED);
    });

    it('PATCH /:id/reactivate → 400 si asso pas SUSPENDED', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
      });
      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('PATCH /:id/reactivate → restaure ARCHIVED → ACTIVE', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.SUSPENDED,
      });
      const mission = await createTestMission(asso.id, {
        status: MissionStatus.ARCHIVED,
      });

      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const m = await prisma.mission.findUniqueOrThrow({
        where: { id: mission.id },
      });
      expect(m.status).toBe(MissionStatus.ACTIVE);
    });
  });

  // ---------------------------------------------------------------- request docs
  describe('Request documents', () => {
    it('POST /:id/request-documents → 400 si types vide', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      const res = await request(httpServer)
        .post(`/admin/associations/${asso.id}/request-documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ types: [] });
      expect(res.status).toBe(400);
    });

    it('POST /:id/request-documents → 201 si types valides', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      const res = await request(httpServer)
        .post(`/admin/associations/${asso.id}/request-documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          types: ['STATUTS', 'RNA_ATTESTATION'],
          message: 'Merci de transmettre.',
        });
      expect(res.status).toBe(201);
      expect((res.body as { sent: boolean }).sent).toBe(true);
    });
  });

  // ---------------------------------------------------------------- documents
  describe('Documents (upload / list / delete / download)', () => {
    it('POST /:id/documents → 400 si type invalide', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      const res = await request(httpServer)
        .post(`/admin/associations/${asso.id}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('type', 'AUTRE')
        .attach('file', pdfBuffer, {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(400);
    });

    it('POST /:id/documents → 400 si fichier manquant', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      const res = await request(httpServer)
        .post(`/admin/associations/${asso.id}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('type', 'STATUTS');
      expect(res.status).toBe(400);
    });

    it('POST /:id/documents → 201 + persiste en base', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });

      const res = await request(httpServer)
        .post(`/admin/associations/${asso.id}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('type', 'STATUTS')
        .attach('file', pdfBuffer, {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(201);

      const docs = await prisma.associationDocument.findMany({
        where: { associationId: asso.id },
      });
      expect(docs.length).toBe(1);
      expect(docs[0].type).toBe('STATUTS');
      expect(mockFileService.uploadFile).toHaveBeenCalled();
    });

    it('GET /:id/documents → liste les docs', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      await prisma.associationDocument.create({
        data: { associationId: asso.id, type: 'STATUTS', fileUrl: 'pid-1' },
      });

      const res = await request(httpServer)
        .get(`/admin/associations/${asso.id}/documents`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBe(1);
    });

    it('DELETE /documents/:documentId → supprime le doc + appelle fileService', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      const doc = await prisma.associationDocument.create({
        data: { associationId: asso.id, type: 'STATUTS', fileUrl: 'pid-x' },
      });

      const res = await request(httpServer)
        .delete(`/admin/associations/documents/${doc.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const after = await prisma.associationDocument.findUnique({
        where: { id: doc.id },
      });
      expect(after).toBeNull();
      expect(mockFileService.deleteFile).toHaveBeenCalledWith('pid-x');
    });

    it('GET /documents/:documentId/download → redirige (mock)', async () => {
      const asso = await createAsso({ ownerId: ownerUserId });
      const doc = await prisma.associationDocument.create({
        data: { associationId: asso.id, type: 'STATUTS', fileUrl: 'pid-1' },
      });

      const res = await request(httpServer)
        .get(`/admin/associations/documents/${doc.id}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .redirects(0);
      expect(res.status).toBe(302);
    });
  });

  // ---------------------------------------------------------------- create / update
  describe('Create / Update', () => {
    it('POST /admin/associations → 201 (asso créée VALIDATED)', async () => {
      const res = await request(httpServer)
        .post('/admin/associations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Asso Officielle',
          ownerUserId,
          siret: '12345678900022',
        });
      expect(res.status).toBe(201);
      const body = res.body as { id: number; status: string };
      const asso = await prisma.association.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(asso.status).toBe(AssociationStatus.VALIDATED);
    });

    it('POST /admin/associations → 409 si SIRET déjà actif', async () => {
      await createAsso({
        ownerId: ownerUserId,
        siret: '99999999900011',
        status: AssociationStatus.VALIDATED,
        name: 'Existante',
      });
      const res = await request(httpServer)
        .post('/admin/associations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Doublon',
          ownerUserId,
          siret: '99999999900011',
        });
      expect(res.status).toBe(409);
    });

    it('PATCH /admin/associations/:id → met à jour les champs autorisés', async () => {
      const asso = await createAsso({ ownerId: ownerUserId, name: 'Avant' });
      const res = await request(httpServer)
        .patch(`/admin/associations/${asso.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Après', website: '' });
      expect(res.status).toBe(200);

      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: asso.id },
      });
      expect(updated.name).toBe('Après');
      expect(updated.website).toBeNull();
    });
  });

  // ---------------------------------------------------------------- missions
  describe('Missions (admin)', () => {
    it('GET /admin/associations/missions/:missionId → 404 si inconnue', async () => {
      const res = await request(httpServer)
        .get('/admin/associations/missions/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('DELETE /admin/associations/missions/:missionId → status DELETED', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
      });
      const mission = await createTestMission(asso.id, {
        status: MissionStatus.ACTIVE,
      });

      const res = await request(httpServer)
        .delete(`/admin/associations/missions/${mission.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Mission non conforme' });
      expect(res.status).toBe(200);

      const m = await prisma.mission.findUniqueOrThrow({
        where: { id: mission.id },
      });
      expect(m.status).toBe(MissionStatus.DELETED);
    });
  });

  // ---------------------------------------------------------------- delete / purge
  describe('Delete / Purge', () => {
    it('DELETE /admin/associations/:id → SUSPENDED + missions DELETED', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
      });
      const mission = await createTestMission(asso.id, {
        status: MissionStatus.ACTIVE,
      });

      const res = await request(httpServer)
        .delete(`/admin/associations/${asso.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Suppression demandée' });
      expect(res.status).toBe(200);

      const updated = await prisma.association.findUniqueOrThrow({
        where: { id: asso.id },
      });
      expect(updated.status).toBe(AssociationStatus.SUSPENDED);

      const m = await prisma.mission.findUniqueOrThrow({
        where: { id: mission.id },
      });
      expect(m.status).toBe(MissionStatus.DELETED);
    });

    it('DELETE /:id/purge → 400 si asso pas REJECTED', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.VALIDATED,
      });
      const res = await request(httpServer)
        .delete(`/admin/associations/${asso.id}/purge`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('DELETE /:id/purge → supprime définitivement une asso REJECTED', async () => {
      const asso = await createAsso({
        ownerId: ownerUserId,
        status: AssociationStatus.REJECTED,
      });
      await prisma.associationDocument.create({
        data: { associationId: asso.id, type: 'STATUTS', fileUrl: 'pid-purge' },
      });

      const res = await request(httpServer)
        .delete(`/admin/associations/${asso.id}/purge`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const after = await prisma.association.findUnique({
        where: { id: asso.id },
      });
      expect(after).toBeNull();
      // L'utilisateur owner reste actif (compte non touché)
      const owner = await prisma.user.findUniqueOrThrow({
        where: { id: ownerUserId },
      });
      expect(owner.status).toBe('ACTIVE');
    });
  });
});
