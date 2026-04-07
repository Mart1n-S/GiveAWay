import { Test, TestingModule } from '@nestjs/testing';
import { GuestGuard } from '../guards/guest.guard';
import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';
import { ImageValidationPipe } from '../../common/pipes/image-validation.pipe';
import { DocumentsValidationPipe } from '../../common/pipes/documents-validation.pipe';

const mockRegisterService = {
  register: jest.fn(),
  registerAssociation: jest.fn(),
};

describe('RegisterController', () => {
  let controller: RegisterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegisterController],
      providers: [{ provide: RegisterService, useValue: mockRegisterService }],
    })
      .overrideGuard(GuestGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RegisterController>(RegisterController);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // register (bénévole)
  // ===========================================================================
  describe('POST /auth/register (bénévole)', () => {
    it('✅ Devrait déléguer au RegisterService avec dto et fichier', async () => {
      const dto = { email: 'a@a.com', password: 'pass' } as any;
      const file = { originalname: 'avatar.png' } as Express.Multer.File;
      mockRegisterService.register.mockResolvedValue({ message: 'ok' });

      const result = await controller.register(dto, file);

      expect(mockRegisterService.register).toHaveBeenCalledWith(dto, file);
      expect(result).toEqual({ message: 'ok' });
    });

    it('✅ Devrait fonctionner sans fichier', async () => {
      mockRegisterService.register.mockResolvedValue({ message: 'ok' });
      await controller.register({} as any, undefined);
      expect(mockRegisterService.register).toHaveBeenCalledWith({}, undefined);
    });

    it("✅ Devrait uploader un fichier et enregistrer l'utilisateur", async () => {
      const file = { originalname: 'test.jpg' } as Express.Multer.File;
      mockRegisterService.register.mockResolvedValue({ message: 'Success' });
      await controller.register({ email: 'test@test.com' } as any, file);
      expect(mockRegisterService.register).toHaveBeenCalledWith(
        { email: 'test@test.com' },
        file,
      );
    });

    it("❌ Devrait propager l'erreur si le service échoue", async () => {
      mockRegisterService.register.mockRejectedValue(new Error('DB Error'));
      await expect(
        controller.register({ email: 'test@test.com' } as any, undefined),
      ).rejects.toThrow('DB Error');
    });
  });

  // ===========================================================================
  // registerAssociation
  // ===========================================================================
  describe('POST /auth/register/association', () => {
    const dto = { name: 'Test Asso', email: 'owner@test.fr' } as any;

    it('✅ Devrait déléguer avec dto, logo et documents validés', async () => {
      jest
        .spyOn(ImageValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);
      jest
        .spyOn(DocumentsValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);

      mockRegisterService.registerAssociation.mockResolvedValue({
        message: 'Inscription soumise',
        requiresManualReview: false,
      });

      const rawFiles = {
        logo: [{ originalname: 'logo.png' } as Express.Multer.File],
        documents: [{ originalname: 'statuts.pdf' } as Express.Multer.File],
      };

      const result = await controller.registerAssociation(dto, rawFiles);

      expect(mockRegisterService.registerAssociation).toHaveBeenCalledWith(
        dto,
        undefined, // ImageValidationPipe mocked → undefined (logo)
        undefined, // DocumentsValidationPipe mocked → undefined
        undefined, // ImageValidationPipe mocked → undefined (profilePicture)
      );
      expect(result.requiresManualReview).toBe(false);
    });

    it('✅ Devrait fonctionner sans fichiers (rawFiles undefined)', async () => {
      jest
        .spyOn(ImageValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);
      jest
        .spyOn(DocumentsValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);

      mockRegisterService.registerAssociation.mockResolvedValue({
        message: 'Dossier soumis',
        requiresManualReview: true,
      });

      const result = await controller.registerAssociation(dto, undefined);

      expect(mockRegisterService.registerAssociation).toHaveBeenCalledWith(
        dto,
        undefined,
        undefined,
        undefined,
      );
      expect(result.requiresManualReview).toBe(true);
    });

    it('✅ Doit passer le logo validé au service', async () => {
      const logoFile = { originalname: 'logo.png' } as Express.Multer.File;
      jest
        .spyOn(ImageValidationPipe.prototype, 'transform')
        .mockImplementation((file) => file);
      jest
        .spyOn(DocumentsValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);

      mockRegisterService.registerAssociation.mockResolvedValue({
        message: 'ok',
        requiresManualReview: false,
      });

      await controller.registerAssociation(dto, {
        logo: [logoFile],
        documents: [],
      });

      expect(mockRegisterService.registerAssociation).toHaveBeenCalledWith(
        dto,
        logoFile,
        undefined,
        undefined,
      );
    });

    it('✅ Doit passer la photo de profil du owner validée au service', async () => {
      const profilePicture = {
        originalname: 'me.jpg',
      } as Express.Multer.File;
      jest
        .spyOn(ImageValidationPipe.prototype, 'transform')
        .mockImplementation((file) => file);
      jest
        .spyOn(DocumentsValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);

      mockRegisterService.registerAssociation.mockResolvedValue({
        message: 'ok',
        requiresManualReview: false,
      });

      await controller.registerAssociation(dto, {
        profilePicture: [profilePicture],
      });

      expect(mockRegisterService.registerAssociation).toHaveBeenCalledWith(
        dto,
        undefined,
        undefined,
        profilePicture,
      );
    });

    it("❌ Devrait propager l'erreur si le service échoue", async () => {
      jest
        .spyOn(ImageValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);
      jest
        .spyOn(DocumentsValidationPipe.prototype, 'transform')
        .mockReturnValue(undefined);

      mockRegisterService.registerAssociation.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(
        controller.registerAssociation(dto, undefined),
      ).rejects.toThrow('Service Error');
    });
  });
});
