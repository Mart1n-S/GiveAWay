import { Injectable, Logger } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import {
  IFileService,
  FileUploadResult,
} from '../interfaces/file-service.interface';

@Injectable()
export class CloudinaryService implements IFileService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Upload un fichier vers Cloudinary via un flux (stream).
   *
   * @param file - Le fichier reçu via Multer (contient le buffer).
   * @param folder - Le dossier de destination sur Cloudinary (ex: 'avatars').
   * @returns Une promesse contenant l'URL sécurisée et l'ID public.
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      // 1. Création du flux d'upload vers Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `giveaway/${folder}`,
          resource_type: 'auto', // Détecte automatiquement (Image, PDF, Vidéo...)
          // Nettoyage du nom de fichier pour le public_id
          public_id: file.originalname
            .split('.')[0]
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase(),
          unique_filename: true,
          overwrite: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          // Gestion des erreurs
          if (error) {
            this.logger.error('Cloudinary upload error', error);
            return reject(
              new Error(error.message || 'Cloudinary upload failed'),
            );
          }

          if (!result) {
            return reject(new Error('Cloudinary response is empty'));
          }

          // En cas de succès, on mappe le résultat vers notre interface générique
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      // 2. Conversion du Buffer du fichier (RAM) en Flux (Stream) pour l'envoyer
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Supprime un fichier de Cloudinary.
   *
   * @param publicId - L'identifiant unique du fichier (ex: 'giveaway/avatars/mon_image').
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Fichier supprimé : ${publicId}`);
    } catch (error) {
      // On log l'erreur mais on ne bloque pas le flux (ex: mise à jour user)
      // car ce n'est pas critique si une vieille image reste traîner.
      this.logger.error(
        `Impossible de supprimer le fichier ${publicId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
