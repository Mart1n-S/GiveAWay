import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { hash } from 'argon2';
import {
  UserStatus,
  AssociationRole,
  AssociationStatus,
  TokenType,
} from '../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';
import { RegisterDto, RegisterAssociationDto } from '@repo/shared';
import { AuthService } from '../auth.service';
import {
  IFileService,
  FILE_SERVICE,
} from '../../common/files/interfaces/file-service.interface';
import { AssociationVerificationService } from './association-verification.service';

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
    private readonly associationVerificationService: AssociationVerificationService,
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

  async registerAssociation(
    dto: RegisterAssociationDto,
    logoFile?: Express.Multer.File,
    documentFiles?: Express.Multer.File[],
    profilePictureFile?: Express.Multer.File,
  ): Promise<{ message: string; requiresManualReview: boolean }> {
    const { prisma } = this.authService;

    // 1. Vérification de disponibilité de l'email (table users)
    await this.authService.checkEmailAvailability(dto.email);

    // 2. Vérification via l'API gouvernementale
    const verification =
      await this.associationVerificationService.verifyAssociation(dto);

    // 3. Blocage si association dissoute / inactive
    if (verification.rejectionReason) {
      throw new BadRequestException(verification.rejectionReason);
    }

    // 4. Hashage du mot de passe
    const hashedPassword = await hash(dto.password);

    // 5. Upload du logo (priorité au fichier multipart, fallback sur l'URL du DTO)
    let logoUrl: string | undefined = dto.logoUrl;
    if (logoFile) {
      const result = await this.fileService.uploadFile(
        logoFile,
        'association-logos',
      );
      logoUrl = result.publicId;
    }

    // 5.b Upload de la photo de profil du owner (optionnelle)
    let profilePictureUrl: string | undefined = dto.profilePicture;
    if (profilePictureFile) {
      try {
        const result = await this.fileService.uploadFile(
          profilePictureFile,
          'avatars',
        );
        profilePictureUrl = result.publicId;
      } catch (error) {
        await this.rollbackUploads(logoFile ? logoUrl : undefined, []);
        throw error;
      }
    }

    // 6. Upload des documents justificatifs (priorité aux fichiers multipart, fallback sur les URLs du DTO)
    const uploadedDocuments: { url: string }[] = (dto.documentUrls ?? []).map(
      (url) => ({ url }),
    );
    if (documentFiles && documentFiles.length > 0) {
      for (const doc of documentFiles) {
        try {
          const result = await this.fileService.uploadFile(
            doc,
            'association-documents',
          );
          uploadedDocuments.push({ url: result.publicId });
        } catch (error) {
          // Rollback uniquement des fichiers uploadés dans cette requête (pas les URLs du DTO)
          const uploadedFileUrls = uploadedDocuments
            .slice(dto.documentUrls?.length ?? 0)
            .map((d) => d.url);
          await this.rollbackUploads(
            logoFile ? logoUrl : undefined,
            uploadedFileUrls,
          );
          throw error;
        }
      }
    }

    // 7. Création du compte user + association (OWNER) + documents en transaction atomique
    let newUserId: number;
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            password: hashedPassword,
            age: dto.age,
            biography: dto.biography,
            profilePicture: profilePictureUrl,
            emailVerifiedAt: null,
            status: UserStatus.PENDING,
            address: {
              create: {
                street: dto.userAddress.street,
                postalCode: dto.userAddress.postalCode,
                city: dto.userAddress.city,
                latitude: dto.userAddress.latitude,
                longitude: dto.userAddress.longitude,
              },
            },
          },
        });
        newUserId = user.id;

        const association = await tx.association.create({
          data: {
            name: dto.name,
            siret: dto.siret,
            rna: dto.rna,
            phone: dto.phone,
            website: dto.website,
            description: dto.description,
            object: dto.object,
            legalStatus: dto.legalStatus,
            logoUrl,
            status: verification.requiresManualReview
              ? AssociationStatus.PENDING
              : AssociationStatus.VALIDATED,
            requiresManualReview: verification.requiresManualReview,
            members: {
              create: {
                userId: user.id,
                role: AssociationRole.OWNER,
              },
            },
            ...(dto.address
              ? {
                  address: {
                    create: {
                      street: dto.address.street,
                      postalCode: dto.address.postalCode,
                      city: dto.address.city,
                      latitude: dto.address.latitude,
                      longitude: dto.address.longitude,
                    },
                  },
                }
              : {}),
          },
        });

        if (uploadedDocuments.length > 0) {
          await tx.associationDocument.createMany({
            data: uploadedDocuments.map((doc) => ({
              fileUrl: doc.url,
              type: 'JUSTIFICATIF',
              associationId: association.id,
            })),
          });
        }
      });
    } catch (error) {
      // Rollback uniquement des fichiers uploadés dans cette requête (pas les URLs du DTO)
      const uploadedFileUrls = uploadedDocuments
        .slice(dto.documentUrls?.length ?? 0)
        .map((d) => d.url);
      await this.rollbackUploads(
        logoFile ? logoUrl : undefined,
        uploadedFileUrls,
        profilePictureFile ? profilePictureUrl : undefined,
      );
      throw error;
    }

    // 8. Génération du token de vérification lié au nouvel utilisateur
    const rawCode = await this.authService.generateAndSaveToken(
      newUserId,
      TokenType.EMAIL_VERIFICATION,
    );

    // 9. Envoi systématique de l'email de vérification OTP
    await this.mailService.sendAssociationVerificationEmail(
      dto.email,
      dto.name,
      rawCode,
    );

    // 9.b Si vérification manuelle requise, envoi en plus du mail d'avis
    if (verification.requiresManualReview) {
      await this.mailService.sendAssociationPendingReviewEmail(
        dto.email,
        dto.name,
      );
    }

    return {
      message: verification.requiresManualReview
        ? 'Votre dossier a été soumis et sera examiné par notre équipe.'
        : 'Inscription soumise ! Veuillez vérifier vos emails pour activer votre compte (Code valide 15 min).',
      requiresManualReview: verification.requiresManualReview,
    };
  }

  private async rollbackUploads(
    logoUrl: string | undefined,
    documentUrls: string[],
    profilePictureUrl?: string,
  ): Promise<void> {
    const toDelete = [
      ...(logoUrl ? [logoUrl] : []),
      ...(profilePictureUrl ? [profilePictureUrl] : []),
      ...documentUrls,
    ];
    await Promise.allSettled(
      toDelete.map((id) =>
        this.fileService
          .deleteFile(id)
          .catch((e) => this.logger.error('Erreur rollback fichier', e)),
      ),
    );
  }
}
