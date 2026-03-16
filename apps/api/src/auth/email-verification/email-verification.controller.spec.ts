import { Test, TestingModule } from '@nestjs/testing';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';
import { GuestGuard } from '../guards/guest.guard';

const mockEmailVerificationService = {
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
};

describe('EmailVerificationController', () => {
  let controller: EmailVerificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailVerificationController],
      providers: [
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
      ],
    })
      .overrideGuard(GuestGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmailVerificationController>(
      EmailVerificationController,
    );
    jest.clearAllMocks();
  });

  it("✅ Devrait vérifier l'email", async () => {
    mockEmailVerificationService.verifyEmail.mockResolvedValue({
      message: 'Email validé',
    });

    await controller.verifyEmail({ code: '123456' });

    expect(mockEmailVerificationService.verifyEmail).toHaveBeenCalledWith(
      '123456',
    );
  });

  it('✅ Devrait renvoyer un email de vérification', async () => {
    const dto = { email: 'test@test.com' };
    mockEmailVerificationService.resendVerificationEmail.mockResolvedValue({
      message: 'Envoyé',
    });

    await controller.resendVerification(dto);

    expect(
      mockEmailVerificationService.resendVerificationEmail,
    ).toHaveBeenCalledWith(dto);
  });
});
