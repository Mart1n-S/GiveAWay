import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RegisterService } from './register.service';
import { AuthService } from '../auth.service';
import { MailService } from '../../mail/mail.service';
import { FILE_SERVICE } from '../../common/files/interfaces/file-service.interface';
import { RegisterDto } from '@repo/shared';

const mockAuthService = {
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    token: { deleteMany: jest.fn(), create: jest.fn() },
  },
  checkEmailAvailability: jest.fn(),
  generateAndSaveToken: jest.fn().mockResolvedValue('123456'),
  logger: { error: jest.fn() },
};

const mockMailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
};

const mockFileService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const dto: RegisterDto = {
  email: 'test@test.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  firstName: 'John',
  lastName: 'Doe',
  age: 20,
  acceptTerms: true,
  address: { street: 'A', city: 'B', postalCode: '12345' },
};

describe('RegisterService', () => {
  let service: RegisterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
        { provide: FILE_SERVICE, useValue: mockFileService },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
    jest.clearAllMocks();
  });

  it('✅ Inscription réussie sans image', async () => {
    mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
    mockAuthService.prisma.user.create.mockResolvedValue({
      id: 1,
      email: dto.email,
    });

    const result = await service.register(dto);

    expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
      dto.email,
    );
    expect(mockFileService.uploadFile).not.toHaveBeenCalled();
    expect(mockAuthService.prisma.user.create).toHaveBeenCalled();
    expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
      dto.email,
      '123456',
    );
    expect(result.message).toContain('Inscription réussie');
  });

  it('✅ Inscription réussie avec image', async () => {
    mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
    mockFileService.uploadFile.mockResolvedValue({ publicId: 'avatars/xyz' });
    mockAuthService.prisma.user.create.mockResolvedValue({
      id: 1,
      email: dto.email,
    });

    const file = { originalname: 'avatar.png' } as Express.Multer.File;
    await service.register(dto, file);

    expect(mockFileService.uploadFile).toHaveBeenCalledWith(file, 'avatars');
    expect(mockAuthService.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ profilePicture: 'avatars/xyz' }),
      }),
    );
  });

  it("❌ Doit lever ConflictException si l'email est pris", async () => {
    mockAuthService.checkEmailAvailability.mockRejectedValue(
      new ConflictException('Email déjà utilisé'),
    );

    await expect(service.register(dto)).rejects.toThrow(ConflictException);
    expect(mockAuthService.prisma.user.create).not.toHaveBeenCalled();
    expect(mockFileService.uploadFile).not.toHaveBeenCalled();
  });

  it("❌ Doit rollback l'image si la création BDD échoue", async () => {
    mockAuthService.checkEmailAvailability.mockResolvedValue(undefined);
    mockFileService.uploadFile.mockResolvedValue({ publicId: 'avatars/xyz' });
    mockAuthService.prisma.user.create.mockRejectedValue(new Error('DB_ERROR'));

    await expect(
      service.register(dto, { originalname: 'img.png' } as Express.Multer.File),
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

    await expect(service.register(dto)).rejects.toThrow('MAIL_DOWN');
  });
});
