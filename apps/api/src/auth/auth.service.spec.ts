import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserStatus, TokenType } from '../generated/prisma/client';
import * as argon2 from 'argon2';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
} from '@repo/shared';

describe('AuthService (Unit)', () => {
  let service: AuthService;

  // --- MOCKS ---
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    token: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('fake_token'),
  };

  const mockMail = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    getOrThrow: jest.fn((key: string): string => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. REGISTER
  // ===========================================================================
  describe('checkEmailAvailability', () => {
    it("✅ Ne doit rien faire si l'email est libre", async () => {
      // Mock : Aucun utilisateur trouvé (null)
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // On s'attend à ce que la promesse se résolve sans erreur
      await expect(
        service.checkEmailAvailability('libre@test.com'),
      ).resolves.not.toThrow();

      // Vérification que Prisma a bien été appelé avec le bon email
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'libre@test.com' },
        select: { id: true },
      });
    });

    it("❌ Doit lever ConflictException si l'email est pris", async () => {
      // Mock : Un utilisateur est trouvé
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.checkEmailAvailability('pris@test.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('register', () => {
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

    it('✅ Inscription réussie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 1, email: dto.email });

      const res = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockMail.sendVerificationEmail).toHaveBeenCalled();
      expect(res.message).toContain('Inscription réussie');
    });

    it('❌ Doit lever ConflictException si email déjà pris (Double Check)', async () => {
      // Si register appelle checkEmailAvailability ou fait un findUnique interne
      mockPrisma.user.findUnique.mockResolvedValue({ id: 99 });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);

      // On s'assure que create n'est JAMAIS appelé si l'email existe
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. VERIFY EMAIL
  // ===========================================================================
  describe('verifyEmail', () => {
    it('✅ Validation réussie', async () => {
      const dbToken = {
        id: 10,
        userId: 1,
        //On spécifie le bon type
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.token.findUnique.mockResolvedValue(dbToken);

      const res = await service.verifyEmail('raw-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: dbToken.userId },
        data: expect.objectContaining({
          status: UserStatus.ACTIVE,
        }) as Prisma.UserUpdateInput,
      });
      expect(mockPrisma.token.delete).toHaveBeenCalledWith({
        where: { id: dbToken.id },
      });
      expect(res.message).toContain('validé avec succès');
    });

    it('❌ Doit lever Unauthorized si token inexistant', async () => {
      mockPrisma.token.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad')).rejects.toThrow(
        BadRequestException,
      );
    });

    it("❌ Doit lever BadRequestException si c'est un token de Reset Password", async () => {
      const dbToken = {
        id: 10,
        userId: 1,
        type: TokenType.PASSWORD_RESET, // Mauvais type
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.token.findUnique.mockResolvedValue(dbToken);

      await expect(service.verifyEmail('raw-token')).rejects.toThrow(
        BadRequestException, // "Lien de validation invalide"
      );
    });

    it('❌ Doit lever Unauthorized si le code à expiré', async () => {
      const dbToken = {
        id: 10,
        userId: 1,
        // Pour atteindre l'erreur "Expiré", le type DOIT être valide d'abord
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() - 1000), // Dans le passé
      };
      mockPrisma.token.findUnique.mockResolvedValue(dbToken);

      await expect(service.verifyEmail('token')).rejects.toThrow(
        'Le code a expiré',
      );

      // On vérifie le nettoyage
      expect(mockPrisma.token.delete).toHaveBeenCalledWith({
        where: { id: dbToken.id },
      });
    });
  });

  // ===========================================================================
  // 3. LOGIN
  // ===========================================================================
  describe('login', () => {
    const dto: LoginDto = { email: 'test@test.com', password: 'Password123!' };

    // Un utilisateur complet pour mocker le retour de Prisma
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      password: 'hashed_password',
      firstName: 'Test',
      lastName: 'User',
      age: 25,
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: 1,
        street: 'Rue de la Paix',
        postalCode: '75000',
        city: 'Paris',
        latitude: null,
        longitude: null,
      },
      associations: [],
    };

    it('✅ Login réussi - Retourne Tokens et User mappé', async () => {
      // 1. On mock Prisma pour qu'il retourne l'user complet
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // 2. On mock Argon2 pour dire "le mot de passe est bon"
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      // 3. Appel
      const res = await service.login(dto, 'Mozilla/5.0', '127.0.0.1');

      // 4. Vérifications
      expect(res).toHaveProperty('tokens');
      expect(res).toHaveProperty('user');
      expect(res.tokens).toHaveProperty('accessToken');
      expect(res.user.email).toBe(dto.email);

      // Vérif que le refresh token est bien sauvegardé
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('❌ Doit lever BadRequestException si mdp incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      // On simule un mauvais mot de passe
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.login(dto, 'agent', 'ip')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si user non trouvé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto, 'agent', 'ip')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================================================
  // 4. LOGOUT
  // ===========================================================================
  describe('logout', () => {
    it('✅ Doit supprimer le refresh token correspondant', async () => {
      const mockTokens = [
        { id: 1, hashedToken: 'hash1' },
        { id: 2, hashedToken: 'hash2' },
      ];
      mockPrisma.refreshToken.findMany.mockResolvedValue(mockTokens);

      // On retire le "async" et on retourne une Promise résolue manuellement
      // pour satisfaire l'interface de argon2.verify qui attend une Promise
      jest
        .spyOn(argon2, 'verify')
        .mockImplementation((h) => Promise.resolve(h === 'hash2'));

      await service.logout(1, 'raw_token_2');

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });
  });

  // ===========================================================================
  // 5. REFRESH TOKENS
  // ===========================================================================
  describe('refreshTokens', () => {
    it('✅ Rotation réussie', async () => {
      const oldToken = {
        id: 100,
        hashedToken: 'old_hash',
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.refreshToken.findMany.mockResolvedValue([oldToken]);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        email: 't@t.com',
        status: UserStatus.ACTIVE,
      });

      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      const res = await service.refreshTokens(1, 'old_raw', 'agent', 'ip');

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 100 },
      });
      expect(res).toHaveProperty('accessToken');
    });

    it('❌ Doit lever Forbidden si token expiré', async () => {
      const expiredToken = {
        id: 1,
        hashedToken: 'h1',
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrisma.refreshToken.findMany.mockResolvedValue([expiredToken]);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      await expect(service.refreshTokens(1, 'raw', 'a', 'i')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===========================================================================
  // 6. RESEND VERIFICATION
  // ===========================================================================
  describe('resendVerificationEmail', () => {
    const dto: ResendVerificationDto = { email: 'test@test.com' };

    it("✅ Doit simuler un succès même si l'utilisateur n'existe pas (Anti-énumération)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await service.resendVerificationEmail(dto);

      expect(res.message).toContain('un nouveau lien a été envoyé');
      expect(mockMail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("✅ Doit simuler un succès si l'email est déjà validé", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: dto.email,
        emailVerifiedAt: new Date(),
      });

      const res = await service.resendVerificationEmail(dto);
      expect(res.message).toContain('un nouveau lien a été envoyé');
      expect(mockMail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("✅ Doit envoyer un nouveau mail si l'utilisateur est PENDING", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        emailVerifiedAt: null,
      });
      // Mock pour le helper generateAndSaveToken appelé en interne
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 99 });

      const res = await service.resendVerificationEmail(dto);

      expect(mockMail.sendVerificationEmail).toHaveBeenCalled();
      expect(res.message).toContain('un nouveau lien a été envoyé');
    });

    it("❌ Doit propager l'erreur si Prisma crash lors de la recherche", async () => {
      // On simule une erreur de connexion à la base de données
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB_ERROR'));

      await expect(service.resendVerificationEmail(dto)).rejects.toThrow(
        'DB_ERROR',
      );
    });

    it("❌ Doit propager l'erreur si l'envoi d'email crash", async () => {
      // 1. L'utilisateur existe et doit recevoir un mail
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        emailVerifiedAt: null,
      });
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 99 });

      // 2. On simule un crash du service mail
      mockMail.sendVerificationEmail.mockRejectedValue(
        new Error('MAIL_SERVER_DOWN'),
      );

      await expect(service.resendVerificationEmail(dto)).rejects.toThrow(
        'MAIL_SERVER_DOWN',
      );
    });
  });

  // ===========================================================================
  // 7. FORGOT PASSWORD (NOUVEAU)
  // ===========================================================================
  describe('forgotPassword', () => {
    const dto: ForgotPasswordDto = { email: 'test@test.com' };

    it("✅ Doit envoyer un mail si l'utilisateur existe", async () => {
      // 1. Mock l'utilisateur trouvé
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        status: UserStatus.ACTIVE,
      });

      // 2. Mock la génération de token
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 99, token: 'hashed' });

      const res = await service.forgotPassword(dto);

      expect(mockPrisma.token.create).toHaveBeenCalled();
      // On vérifie qu'on appelle la bonne méthode du mailer
      expect(mockMail.sendPasswordResetEmail).toHaveBeenCalledWith(
        dto.email,
        expect.any(String),
      );
      expect(res.message).toContain('lien de réinitialisation');
    });

    it("✅ Anti-énumération : Succès silencieux si l'user n'existe pas", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await service.forgotPassword(dto);

      expect(mockMail.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(mockPrisma.token.create).not.toHaveBeenCalled();
      expect(res.message).toContain('lien de réinitialisation');
    });

    it("✅ Anti-énumération : Succès silencieux si l'user est supprimé", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        status: UserStatus.DELETED,
      });

      const res = await service.forgotPassword(dto);

      expect(mockMail.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(res.message).toContain('lien de réinitialisation');
    });

    it("✅ Anti-énumération : Succès silencieux si l'user est suspendu", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        status: UserStatus.SUSPENDED,
      });

      const res = await service.forgotPassword(dto);

      expect(mockMail.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(res.message).toContain('lien de réinitialisation');
    });

    it("✅ Anti-énumération : Succès silencieux si l'user n'a pas encore validé son email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        status: UserStatus.PENDING,
      });

      const res = await service.forgotPassword(dto);

      expect(mockMail.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(res.message).toContain('lien de réinitialisation');
    });
  });

  // ===========================================================================
  // 8. RESET PASSWORD
  // ===========================================================================
  describe('resetPassword', () => {
    // On utilise le DTO complet pour le typage
    const dto: ResetPasswordDto = {
      code: '123456',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('✅ Succès : Doit changer le mdp, supprimer le token et déconnecter les sessions', async () => {
      // 1. Mock : Token valide trouvé en base
      const mockDbToken = {
        id: 50,
        userId: 1,
        type: TokenType.PASSWORD_RESET, // Utilisation de l'Enum
        expiresAt: new Date(Date.now() + 10000), // Expire dans le futur
      };
      mockPrisma.token.findUnique.mockResolvedValue(mockDbToken);

      // 2. Mock : Hashage du nouveau mot de passe
      const spyHash = jest
        .spyOn(argon2, 'hash')
        .mockResolvedValue('new_hashed_pass');

      const res = await service.resetPassword(dto);

      // --- VÉRIFICATIONS ---

      // A. Recherche du token
      expect(mockPrisma.token.findUnique).toHaveBeenCalled();

      // B. Hashage du nouveau mot de passe
      expect(spyHash).toHaveBeenCalledWith(dto.password);

      // C. Mise à jour de l'utilisateur
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockDbToken.userId },
        data: { password: 'new_hashed_pass' },
      });

      // D. SÉCURITÉ : Suppression du token utilisé
      expect(mockPrisma.token.delete).toHaveBeenCalledWith({
        where: { id: mockDbToken.id },
      });

      // E. SÉCURITÉ : Déconnexion forcée (Suppression des Refresh Tokens)
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockDbToken.userId },
      });

      expect(res.message).toContain('modifié avec succès');
    });

    it('❌ Echec : Token introuvable', async () => {
      mockPrisma.token.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Echec : Mauvais Type de Token (ex: Email Verification)', async () => {
      // Mock : On trouve un token, mais c'est un token de validation d'email
      const mockDbToken = {
        id: 50,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.token.findUnique.mockResolvedValue(mockDbToken);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Echec : Token expiré', async () => {
      const mockDbToken = {
        id: 50,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() - 1000), // Dans le passé
      };
      mockPrisma.token.findUnique.mockResolvedValue(mockDbToken);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );

      // Vérification que le token périmé est bien supprimé automatiquement
      expect(mockPrisma.token.delete).toHaveBeenCalledWith({
        where: { id: mockDbToken.id },
      });
    });
  });

  // ===========================================================================
  // 9. CHANGE PASSWORD
  // ===========================================================================
  describe('changePassword', () => {
    const userId = 1;
    const dto = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('✅ Changement de mot de passe réussi', async () => {
      // 1. Setup : Utilisateur existant avec un hash
      const mockUser = { id: userId, password: 'hashed_old_password' };

      // 2. Configuration des Mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true); // Ancien mdp OK
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_new_password'); // Nouveau hash généré

      // On simule l'update qui renvoie l'user modifié
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        password: 'hashed_new_password',
      });

      // On simule la suppression des refresh tokens
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      // 3. Exécution
      const res = await service.changePassword(userId, dto);

      // 4. Vérifications
      // On vérifie qu'on a bien cherché l'utilisateur
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      // On vérifie qu'on a comparé le hash en BDD avec l'ancien mot de passe fourni
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.password,
        dto.oldPassword,
      );

      // On vérifie qu'on a hashé le NOUVEAU mot de passe
      expect(argon2.hash).toHaveBeenCalledWith(dto.newPassword);

      // On vérifie la mise à jour en BDD
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'hashed_new_password' },
      });

      // SÉCURITÉ : On vérifie que les sessions ont été révoquées
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(res.message).toContain('succès');
    });

    it('❌ Doit lever BadRequestException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ Doit lever BadRequestException si ancien mot de passe incorrect', async () => {
      const mockUser = { id: userId, password: 'hashed_old_password' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Simulation : argon2 dit que le mot de passe ne correspond pas
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        BadRequestException, // "Ancien mot de passe incorrect"
      );

      // SÉCURITÉ : On vérifie que rien n'a été modifié ni hashé
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 10. GET ME
  // ===========================================================================
  describe('getMe', () => {
    // On définit un mockUser complet pour tester le mapping
    const mockUserComplete = {
      id: 1,
      email: 'me@test.com',
      firstName: 'Me',
      lastName: 'Myself',
      age: 30,
      biography: 'Bio',
      profilePicture: null,
      password: 'hash',
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: 10,
        street: 'Rue Test',
        postalCode: '75000',
        city: 'Paris',
        latitude: 48.85,
        longitude: 2.35,
      },
      associations: [
        {
          associationId: 5,
          role: 'PRESIDENT',
          association: { name: 'Asso Test' },
        },
      ],
    };

    it('✅ Doit retourner un User mappé (Format Shared DTO)', async () => {
      // 1. Mock Prisma
      mockPrisma.user.findUnique.mockResolvedValue(mockUserComplete);

      // 2. Appel
      const res = await service.getMe(1);

      // 3. Vérifications (Mapping)
      expect(res.id).toBe(1);
      expect(res.email).toBe('me@test.com');

      // Vérif que les dates sont bien converties en string (ISO)
      expect(typeof res.createdAt).toBe('string');

      // Vérif que l'adresse est bien là
      expect(res.address).not.toBeNull();
      expect(res.address?.city).toBe('Paris');

      // Vérif des associations
      expect(res.associations).toHaveLength(1);
      expect(res.associations?.[0]?.name).toBe('Asso Test');
    });

    it('❌ Doit lever Unauthorized si user non trouvé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(UnauthorizedException);
    });

    it('❌ Doit lever BadRequestException si user SUSPENDU', async () => {
      // On reprend l'user mais on change son statut
      const suspendedUser = {
        ...mockUserComplete,
        status: UserStatus.SUSPENDED,
      };
      mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);

      await expect(service.getMe(1)).rejects.toThrow(BadRequestException);
    });

    it('❌ Doit lever BadRequestException si user SUPPRIMÉ', async () => {
      const deletedUser = { ...mockUserComplete, status: UserStatus.DELETED };
      mockPrisma.user.findUnique.mockResolvedValue(deletedUser);

      await expect(service.getMe(1)).rejects.toThrow(BadRequestException);
    });
  });
});
