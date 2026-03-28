import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordService } from './password.service';
import { AuthService } from '../auth.service';
import { MailService } from '../../mail/mail.service';
import { TokenType, UserStatus } from '../../generated/prisma/client';
import { ForgotPasswordDto, ResetPasswordDto } from '@repo/shared';

const mockAuthService = {
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    token: { findUnique: jest.fn(), delete: jest.fn() },
    refreshToken: { deleteMany: jest.fn() },
  },
  logger: { warn: jest.fn(), log: jest.fn() },
  generateAndSaveToken: jest.fn().mockResolvedValue('123456'),
};

const mockMailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    const dto: ForgotPasswordDto = { email: 'test@test.com' };

    it("✅ Doit envoyer un mail si l'utilisateur est ACTIVE", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        status: UserStatus.ACTIVE,
      });

      const result = await service.forgotPassword(dto);

      expect(mockAuthService.generateAndSaveToken).toHaveBeenCalledWith(
        1,
        TokenType.PASSWORD_RESET,
      );
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        dto.email,
        '123456',
      );
      expect(result.message).toContain('lien de réinitialisation');
    });

    it("✅ Anti-énumération : succès silencieux si l'user n'existe pas", async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toContain('lien de réinitialisation');
    });

    it.each([UserStatus.DELETED, UserStatus.SUSPENDED, UserStatus.PENDING])(
      '✅ Anti-énumération : succès silencieux si statut = %s',
      async (status) => {
        mockAuthService.prisma.user.findUnique.mockResolvedValue({
          id: 1,
          status,
        });

        const result = await service.forgotPassword(dto);

        expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(result.message).toContain('lien de réinitialisation');
      },
    );
  });

  describe('resetPassword', () => {
    const dto: ResetPasswordDto = {
      code: '123456',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('✅ Doit changer le mdp, supprimer le token et déconnecter les sessions', async () => {
      const dbToken = {
        id: 50,
        userId: 1,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 10000),
      };
      mockAuthService.prisma.token.findUnique.mockResolvedValue(dbToken);
      jest.spyOn(argon2, 'hash').mockResolvedValue('new_hashed_pass' as never);

      const result = await service.resetPassword(dto);

      expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'new_hashed_pass' },
      });
      expect(mockAuthService.prisma.token.delete).toHaveBeenCalledWith({
        where: { id: 50 },
      });
      expect(
        mockAuthService.prisma.refreshToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(result.message).toContain('modifié avec succès');
    });

    it('❌ Doit lever BadRequestException si token introuvable', async () => {
      mockAuthService.prisma.token.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si mauvais type de token', async () => {
      mockAuthService.prisma.token.findUnique.mockResolvedValue({
        id: 50,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si token expiré et le supprimer', async () => {
      const expiredToken = {
        id: 50,
        userId: 1,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockAuthService.prisma.token.findUnique.mockResolvedValue(expiredToken);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAuthService.prisma.token.delete).toHaveBeenCalledWith({
        where: { id: 50 },
      });
    });
  });

  describe('changePassword', () => {
    const userId = 1;
    const dto = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('✅ Changement réussi — révoque toutes les sessions', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        id: userId,
        password: 'hashed_old',
      });
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      jest.spyOn(argon2, 'hash').mockResolvedValue('hashed_new' as never);

      const result = await service.changePassword(userId, dto);

      expect(mockAuthService.prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'hashed_new' },
      });
      expect(
        mockAuthService.prisma.refreshToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result.message).toContain('succès');
    });

    it('❌ Doit lever BadRequestException si utilisateur introuvable', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si ancien mot de passe incorrect', async () => {
      mockAuthService.prisma.user.findUnique.mockResolvedValue({
        id: userId,
        password: 'hashed_old',
      });
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockAuthService.prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
