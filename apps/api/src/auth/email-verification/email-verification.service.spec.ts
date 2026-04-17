import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { AuthService } from '../auth.service';
import { MailService } from '../../mail/mail.service';
import { TokenType, UserStatus } from '../../generated/prisma/client';
import { ResendVerificationDto } from '@repo/shared';

const mockAuthService = {
  prisma: {
    token: { findUnique: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
  generateAndSaveToken: jest.fn().mockResolvedValue('123456'),
};

const mockMailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
};

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    jest.clearAllMocks();
  });

  describe('verifyEmail', () => {
    it('✅ Validation réussie', async () => {
      const dbToken = {
        id: 10,
        userId: 1,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 10000),
      };
      mockAuthService.prisma.token.findUnique.mockResolvedValue(dbToken);

      const result = await service.verifyEmail('raw-code');

      expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: UserStatus.ACTIVE }),
      });
      expect(mockAuthService.prisma.token.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(result.message).toContain('validé avec succès');
    });

    it('❌ Doit lever BadRequestException si token inexistant', async () => {
      mockAuthService.prisma.token.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-code')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si mauvais type de token', async () => {
      mockAuthService.prisma.token.findUnique.mockResolvedValue({
        id: 10,
        userId: 1,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(service.verifyEmail('raw-code')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si token expiré et le supprimer', async () => {
      const expiredToken = {
        id: 10,
        userId: 1,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockAuthService.prisma.token.findUnique.mockResolvedValue(expiredToken);

      await expect(service.verifyEmail('raw-code')).rejects.toThrow(
        'Le code a expiré',
      );
      expect(mockAuthService.prisma.token.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });
  });

  describe('resendVerificationEmail', () => {
    const dto: ResendVerificationDto = { email: 'test@test.com' };

    it("✅ Anti-énumération : succès silencieux si l'user n'existe pas", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerificationEmail(dto);

      expect(result.message).toContain('un nouveau lien a été envoyé');
      expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("✅ Anti-énumération : succès silencieux si l'email est déjà validé", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        emailVerifiedAt: new Date(),
      });

      const result = await service.resendVerificationEmail(dto);

      expect(result.message).toContain('un nouveau lien a été envoyé');
      expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("✅ Doit envoyer un email si l'utilisateur est PENDING", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        emailVerifiedAt: null,
      });

      const result = await service.resendVerificationEmail(dto);

      expect(mockAuthService.generateAndSaveToken).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        dto.email,
        '123456',
      );
      expect(result.message).toContain('un nouveau lien a été envoyé');
    });

    it("❌ Doit propager l'erreur si l'envoi d'email échoue", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        emailVerifiedAt: null,
      });
      mockMailService.sendVerificationEmail.mockRejectedValue(
        new Error('MAIL_DOWN'),
      );

      await expect(service.resendVerificationEmail(dto)).rejects.toThrow(
        'MAIL_DOWN',
      );
    });
  });
});
