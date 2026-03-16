import { Injectable, Inject } from '@nestjs/common';
import { hash } from 'argon2';
import { UserStatus, TokenType } from '../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';
import { RegisterDto } from '@repo/shared';
import { AuthService } from '../auth.service';
import {
  IFileService,
  FILE_SERVICE,
} from '../../common/files/interfaces/file-service.interface';

@Injectable()
export class RegisterService {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
  ) {}

  async register(dto: RegisterDto, file?: Express.Multer.File) {
    const { prisma } = this.authService;

    // 1. Vérification métier — coupe ici si email pris, on n'upload rien
    await this.authService.checkEmailAvailability(dto.email);

    // 2. Upload de l'image si fournie
    let profilePictureUrl: string | undefined;
    if (file) {
      const uploadResult = await this.fileService.uploadFile(file, 'avatars');
      profilePictureUrl = uploadResult.publicId;
    }

    // 3. Hashage du mot de passe
    const hashedPassword = await hash(dto.password);

    // 4. Création de l'utilisateur
    let newUser: Awaited<ReturnType<typeof prisma.user.create>>;
    try {
      newUser = await prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          age: dto.age,
          biography: dto.biography,
          profilePicture: profilePictureUrl,
          password: hashedPassword,
          emailVerifiedAt: null,
          status: UserStatus.PENDING,
          address: {
            create: {
              street: dto.address.street,
              postalCode: dto.address.postalCode,
              city: dto.address.city,
              latitude: dto.address.latitude,
              longitude: dto.address.longitude,
            },
          },
        },
      });
    } catch (error) {
      // 5. Rollback image si la création BDD échoue
      if (profilePictureUrl) {
        this.fileService
          .deleteFile(profilePictureUrl)
          .catch((e) =>
            this.authService.logger.error('Erreur rollback image', e),
          );
      }
      throw error;
    }

    // 6. Génération et sauvegarde du token de vérification
    const rawCode = await this.authService.generateAndSaveToken(
      newUser.id,
      TokenType.EMAIL_VERIFICATION,
    );

    // 7. Envoi de l'email de vérification
    await this.mailService.sendVerificationEmail(dto.email, rawCode);

    return {
      message:
        'Inscription réussie ! Veuillez vérifier vos emails pour activer votre compte (Code valide 15 min).',
    };
  }
}
