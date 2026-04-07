import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { RegisterService } from './register.service';
import { AuthService } from '../auth.service';
import { MailService } from '../../mail/mail.service';
import { FILE_SERVICE } from '../../common/files/interfaces/file-service.interface';
import { AssociationVerificationService } from './association-verification.service';
import { RegisterDto, RegisterAssociationDto } from '@repo/shared';
import { AssociationStatus } from '../../generated/prisma/client';

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------
const mockTx = {
  user: { create: jest.fn() },
  association: { create: jest.fn() },
  associationDocument: { createMany: jest.fn() },
};

const mockAuthService = {
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    token: { deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
      ),
  },
  checkEmailAvailability: jest.fn(),
  generateAndSaveToken: jest.fn().mockResolvedValue('123456'),
  logger: { error: jest.fn() },
};

const mockMailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendAssociationVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendAssociationPendingReviewEmail: jest.fn().mockResolvedValue(undefined),
};

const mockFileService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const mockVerificationService = {
  verifyAssociation: jest.fn(),
};

// ----------------------------------------------------------------
// Données de test
// ----------------------------------------------------------------
const userDto: RegisterDto = {
  email: 'test@test.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  firstName: 'John',
  lastName: 'Doe',
  age: 20,
  acceptTerms: true,
  address: { street: 'A', city: 'B', postalCode: '12345' },
};

const validAddress = {
  street: '10 rue de la Paix',
  postalCode: '75001',
  city: 'Paris',
};

const assocDto: RegisterAssociationDto = {
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@asso.fr',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  age: 30,
  acceptTerms: true,
  userAddress: validAddress,
  address: validAddress,
  name: 'Les Amis du Quartier',
  rna: 'W123456789',
  object: 'Objet statutaire',
  legalStatus: 'Association loi 1901',
} as unknown as RegisterAssociationDto;

const verifiedResult = {
  exists: true,
  isActive: true,
  isConsistent: true,
  officialData: null,
  requiresManualReview: false,
};

const manualReviewResult = {
  exists: false,
  isActive: false,
  isConsistent: false,
  officialData: null,
  requiresManualReview: true,
};

// ----------------------------------------------------------------
// Suite
// ----------------------------------------------------------------
describe('RegisterService', () => {
  let service: RegisterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
        { provide: FILE_SERVICE, useValue: mockFileService },
        {
          provide: AssociationVerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
    jest.clearAllMocks();

    // Reset transaction mock après clearAllMocks
    mockAuthService.prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
    mockTx.user.create.mockResolvedValue({ id: 1 });
    mockTx.association.create.mockResolvedValue({ id: 42 });
    mockTx.associationDocument.createMany.mockResolvedValue({ count: 0 });
  });

  // ===========================================================================
  // register (user)
  // ===========================================================================
  describe('register (bénévole)', () => {
    it('✅ Inscription réussie sans image', async () => {
      mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
      mockAuthService.prisma.user.create.mockResolvedValue({
        id: 1,
        email: userDto.email,
      });

      const result = await service.register(userDto);

      expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
        userDto.email,
      );
      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        userDto.email,
        '123456',
      );
      expect(result.message).toContain('Inscription réussie');
    });

    it('✅ Inscription réussie avec image', async () => {
      mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
      mockFileService.uploadFile.mockResolvedValue({ publicId: 'avatars/xyz' });
      mockAuthService.prisma.user.create.mockResolvedValue({
        id: 1,
        email: userDto.email,
      });

      const file = { originalname: 'avatar.png' } as Express.Multer.File;
      await service.register(userDto, file);

      expect(mockFileService.uploadFile).toHaveBeenCalledWith(file, 'avatars');
      expect(mockAuthService.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ profilePicture: 'avatars/xyz' }),
        }),
      );
    });

    it("❌ Doit lever ConflictException si l'email est pris", async () => {
      mockAuthService.checkEmailAvailability.mockRejectedValue(
        new ConflictException(),
      );
      await expect(service.register(userDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockAuthService.prisma.user.create).not.toHaveBeenCalled();
    });

    it("❌ Doit rollback l'image si la création BDD échoue", async () => {
      mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
      mockFileService.uploadFile.mockResolvedValue({ publicId: 'avatars/xyz' });
      mockAuthService.prisma.user.create.mockRejectedValue(
        new Error('DB_ERROR'),
      );

      await expect(
        service.register(userDto, {
          originalname: 'img.png',
        } as Express.Multer.File),
      ).rejects.toThrow('DB_ERROR');

      await new Promise((r) => setTimeout(r, 10));
      expect(mockFileService.deleteFile).toHaveBeenCalledWith('avatars/xyz');
    });

    it("❌ Doit propager l'erreur si l'envoi d'email échoue", async () => {
      mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
      mockAuthService.prisma.user.create.mockResolvedValue({ id: 1 });
      mockMailService.sendVerificationEmail.mockRejectedValue(
        new Error('MAIL_DOWN'),
      );

      await expect(service.register(userDto)).rejects.toThrow('MAIL_DOWN');
    });
  });

  // ===========================================================================
  // registerAssociation
  // ===========================================================================
  describe('registerAssociation', () => {
    // ----------------------------------------------------------------
    // Flux : API validée → email vérification
    // ----------------------------------------------------------------
    describe('Flux — API validée (requiresManualReview: false)', () => {
      it("✅ Doit créer le user + l'association (OWNER), générer un OTP et envoyer l'email de vérification", async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );

        const result = await service.registerAssociation(assocDto);

        expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
          assocDto.email,
        );
        expect(mockVerificationService.verifyAssociation).toHaveBeenCalledWith(
          assocDto,
        );
        expect(mockTx.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: assocDto.email,
              firstName: assocDto.firstName,
              lastName: assocDto.lastName,
            }),
          }),
        );
        expect(mockTx.association.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: assocDto.name,
              status: AssociationStatus.VALIDATED,
              requiresManualReview: false,
              members: { create: { userId: 1, role: 'OWNER' } },
            }),
          }),
        );
        expect(mockAuthService.generateAndSaveToken).toHaveBeenCalledWith(
          1,
          'EMAIL_VERIFICATION',
        );
        expect(
          mockMailService.sendAssociationVerificationEmail,
        ).toHaveBeenCalledWith(assocDto.email, assocDto.name, '123456');
        expect(
          mockMailService.sendAssociationPendingReviewEmail,
        ).not.toHaveBeenCalled();
        expect(result.requiresManualReview).toBe(false);
        expect(result.message).toContain('Inscription soumise');
      });
    });

    // ----------------------------------------------------------------
    // Flux : revue manuelle
    // ----------------------------------------------------------------
    describe('Flux — revue manuelle (requiresManualReview: true)', () => {
      it("✅ Doit créer l'association et envoyer l'email de revue manuelle", async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          manualReviewResult,
        );

        const result = await service.registerAssociation(assocDto);

        expect(mockTx.association.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: AssociationStatus.PENDING,
              requiresManualReview: true,
            }),
          }),
        );
        expect(
          mockMailService.sendAssociationPendingReviewEmail,
        ).toHaveBeenCalledWith(assocDto.email, assocDto.name);
        // L'email de vérification OTP est envoyé systématiquement,
        // même quand une revue manuelle est requise (l'utilisateur doit
        // valider son email avant que l'équipe examine le dossier).
        expect(
          mockMailService.sendAssociationVerificationEmail,
        ).toHaveBeenCalledWith(assocDto.email, assocDto.name, '123456');
        expect(result.requiresManualReview).toBe(true);
        expect(result.message).toContain('examiné');
      });
    });

    // ----------------------------------------------------------------
    // Blocage
    // ----------------------------------------------------------------
    describe('Blocage — association dissoute', () => {
      it("❌ Doit lever BadRequestException si l'association est dissoute", async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue({
          ...verifiedResult,
          isActive: false,
          rejectionReason: "L'association est fermée.",
        });

        await expect(service.registerAssociation(assocDto)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockTx.association.create).not.toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------------
    // Email déjà utilisé
    // ----------------------------------------------------------------
    describe('Email déjà utilisé', () => {
      it("❌ Doit lever ConflictException si l'email est pris", async () => {
        mockAuthService.checkEmailAvailability.mockRejectedValue(
          new ConflictException(),
        );

        await expect(service.registerAssociation(assocDto)).rejects.toThrow(
          ConflictException,
        );
        expect(
          mockVerificationService.verifyAssociation,
        ).not.toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------------
    // Upload fichiers
    // ----------------------------------------------------------------
    describe('Upload de fichiers', () => {
      it('✅ Doit uploader le logo et le stocker', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile.mockResolvedValue({ publicId: 'logos/abc' });

        const logo = { originalname: 'logo.png' } as Express.Multer.File;
        await service.registerAssociation(assocDto, logo);

        expect(mockFileService.uploadFile).toHaveBeenCalledWith(
          logo,
          'association-logos',
        );
        expect(mockTx.association.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ logoUrl: 'logos/abc' }),
          }),
        );
      });

      it('✅ Doit uploader les documents justificatifs', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile.mockResolvedValue({ publicId: 'docs/xyz' });

        const doc = { originalname: 'statuts.pdf' } as Express.Multer.File;
        await service.registerAssociation(assocDto, undefined, [doc]);

        expect(mockFileService.uploadFile).toHaveBeenCalledWith(
          doc,
          'association-documents',
        );
        expect(mockTx.associationDocument.createMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                fileUrl: 'docs/xyz',
                type: 'JUSTIFICATIF',
              }),
            ]),
          }),
        );
      });

      it('✅ Doit utiliser dto.logoUrl comme fallback si aucun fichier logo fourni', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );

        const dtoWithLogoUrl = {
          ...assocDto,
          logoUrl: 'uploads/existing-logo.png',
        };
        await service.registerAssociation(
          dtoWithLogoUrl as RegisterAssociationDto,
        );

        expect(mockFileService.uploadFile).not.toHaveBeenCalled();
        expect(mockTx.association.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              logoUrl: 'uploads/existing-logo.png',
            }),
          }),
        );
      });

      it('❌ Doit rollback le logo si la transaction BDD échoue', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile.mockResolvedValue({ publicId: 'logos/abc' });
        mockAuthService.prisma.$transaction.mockRejectedValue(
          new Error('DB_FAIL'),
        );

        const logo = { originalname: 'logo.png' } as Express.Multer.File;
        await expect(
          service.registerAssociation(assocDto, logo),
        ).rejects.toThrow('DB_FAIL');

        expect(mockFileService.deleteFile).toHaveBeenCalledWith('logos/abc');
      });

      it('✅ Doit uploader la photo de profil du owner et la stocker', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile.mockResolvedValue({
          publicId: 'avatars/owner',
        });

        const pic = { originalname: 'me.jpg' } as Express.Multer.File;
        await service.registerAssociation(assocDto, undefined, undefined, pic);

        expect(mockFileService.uploadFile).toHaveBeenCalledWith(pic, 'avatars');
        expect(mockTx.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ profilePicture: 'avatars/owner' }),
          }),
        );
      });

      it("❌ Doit rollback le logo si l'upload de la photo de profil échoue", async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile
          .mockResolvedValueOnce({ publicId: 'logos/abc' })
          .mockRejectedValueOnce(new Error('PIC_FAIL'));

        const logo = { originalname: 'logo.png' } as Express.Multer.File;
        const pic = { originalname: 'me.jpg' } as Express.Multer.File;

        await expect(
          service.registerAssociation(assocDto, logo, undefined, pic),
        ).rejects.toThrow('PIC_FAIL');

        expect(mockFileService.deleteFile).toHaveBeenCalledWith('logos/abc');
      });

      it('✅ Doit utiliser dto.documentUrls comme fallback si aucun fichier document fourni', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );

        const dtoWithDocs = {
          ...assocDto,
          documentUrls: ['uploads/existing-statuts.pdf'],
        };
        await service.registerAssociation(
          dtoWithDocs as RegisterAssociationDto,
        );

        expect(mockFileService.uploadFile).not.toHaveBeenCalled();
        expect(mockTx.associationDocument.createMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                fileUrl: 'uploads/existing-statuts.pdf',
                type: 'JUSTIFICATIF',
              }),
            ]),
          }),
        );
      });

      it('❌ Ne doit PAS rollback les URLs du DTO si la transaction échoue (uniquement les fichiers uploadés)', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile.mockResolvedValue({ publicId: 'docs/new' });
        mockAuthService.prisma.$transaction.mockRejectedValue(
          new Error('DB_FAIL'),
        );

        const dtoWithDocs = {
          ...assocDto,
          documentUrls: ['uploads/existing.pdf'],
        };
        const newDoc = { originalname: 'new.pdf' } as Express.Multer.File;

        await expect(
          service.registerAssociation(
            dtoWithDocs as RegisterAssociationDto,
            undefined,
            [newDoc],
          ),
        ).rejects.toThrow('DB_FAIL');

        expect(mockFileService.deleteFile).toHaveBeenCalledWith('docs/new');
        expect(mockFileService.deleteFile).not.toHaveBeenCalledWith(
          'uploads/existing.pdf',
        );
      });

      it('❌ Doit rollback les documents uploadés si un upload échoue en cours de boucle', async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
        mockVerificationService.verifyAssociation.mockResolvedValue(
          verifiedResult,
        );
        mockFileService.uploadFile
          .mockResolvedValueOnce({ publicId: 'docs/first' })
          .mockRejectedValueOnce(new Error('UPLOAD_FAIL'));

        const docs = [
          { originalname: 'a.pdf' } as Express.Multer.File,
          { originalname: 'b.pdf' } as Express.Multer.File,
        ];

        await expect(
          service.registerAssociation(assocDto, undefined, docs),
        ).rejects.toThrow('UPLOAD_FAIL');

        expect(mockFileService.deleteFile).toHaveBeenCalledWith('docs/first');
      });
    });
  });
});
