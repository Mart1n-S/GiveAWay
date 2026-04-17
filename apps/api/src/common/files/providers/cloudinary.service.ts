import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import { randomUUID } from 'node:crypto';
import {
  IFileService,
  FileUploadResult,
  FileDownloadResult,
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
          // Nom d'origine sanitisé + UUID pour garantir l'unicité et traçabilité
          public_id: (() => {
            const dotIndex = file.originalname.lastIndexOf('.');
            const base =
              dotIndex > 0
                ? file.originalname.substring(0, dotIndex)
                : file.originalname;
            const sanitized = base
              .replaceAll(/[^a-zA-Z0-9_-]/g, '_')
              .substring(0, 60);
            return `${sanitized}-${randomUUID()}`;
          })(),
          unique_filename: false,
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
   * Retourne une URL de téléchargement CDN Cloudinary (redirection 302).
   * Cloudinary détermine lui-même le resource_type via l'Admin API.
   */
  async getFileForDownload(publicId: string): Promise<FileDownloadResult> {
    let resourceType: string;

    try {
      // Essai avec resource_type 'image' (PNG, JPG, WEBP…)
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: 'image',
      });
      resourceType = resource.resource_type ?? 'image';
    } catch {
      try {
        // Fallback sur 'raw' (PDF, archives…)
        const resource = await cloudinary.api.resource(publicId, {
          resource_type: 'raw',
        });
        resourceType = resource.resource_type ?? 'raw';
      } catch {
        throw new NotFoundException(
          `Fichier Cloudinary introuvable : ${publicId}`,
        );
      }
    }

    // Génère une URL avec le flag fl_attachment (force le téléchargement côté navigateur)
    const url = cloudinary.url(publicId, {
      resource_type: resourceType as 'image' | 'raw' | 'video',
      flags: 'attachment',
      secure: true,
    });

    return { type: 'redirect', url };
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
