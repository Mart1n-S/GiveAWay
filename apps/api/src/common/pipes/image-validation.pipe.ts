import {
  PipeTransform,
  Injectable,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  constructor(
    private readonly isRequired: boolean = false,
    private readonly maxSize: number = 5 * 1024 * 1024, // 5 Mo par défaut
  ) {}

  transform(
    file: Express.Multer.File | undefined,
  ): Express.Multer.File | undefined {
    try {
      // 1. Vérification présence du fichier
      if (!file) {
        if (this.isRequired) {
          throw new UnprocessableEntityException("L'image est obligatoire.");
        }
        return undefined;
      }

      // 2. Vérification taille AVANT analyse du buffer (performance)
      if (file.size > this.maxSize) {
        const maxSizeMB = this.maxSize / (1024 * 1024);
        throw new UnprocessableEntityException(
          `L'image est trop volumineuse (Max ${maxSizeMB} Mo).`,
        );
      }

      // 3. Vérification taille minimale (éviter les fichiers vides/corrompus)
      if (file.size < 12) {
        throw new UnprocessableEntityException(
          'Fichier invalide (trop petit).',
        );
      }

      // 4. Validation sécurisée : Magic Numbers (signature binaire réelle)
      if (!this.validateFileSignature(file.buffer)) {
        throw new UnprocessableEntityException(
          'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés.',
        );
      }

      // 5. Vérification supplémentaire du mimetype (défense en profondeur)
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.mimetype)) {
        throw new UnprocessableEntityException(
          'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés.',
        );
      }

      return file;
    } catch (error) {
      // Gestion des erreurs déjà typées
      if (
        error instanceof UnprocessableEntityException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Erreur inattendue (buffer corrompu, etc.)
      console.error('Erreur inattendue lors de la validation image:', error);
      throw new UnprocessableEntityException(
        'Impossible de valider le fichier.',
      );
    }
  }

  /**
   * Valide la signature binaire (Magic Numbers) du fichier.
   * Ne fait PAS confiance au mimetype qui peut être falsifié côté client.
   */
  private validateFileSignature(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }

    // Lire les 4 premiers octets (signature du fichier)
    const header = buffer.toString('hex', 0, 4).toUpperCase();

    // JPEG : FF D8 FF xx
    if (header.startsWith('FFD8FF')) {
      return true;
    }

    // PNG : 89 50 4E 47
    if (header === '89504E47') {
      return true;
    }

    // WEBP : Commence par "RIFF" (52 49 46 46)
    // puis "WEBP" aux octets 8-12
    if (header === '52494646') {
      // Vérifier qu'on a assez d'octets pour lire "WEBP"
      if (buffer.length < 12) {
        return false;
      }

      // Lire "WEBP" (57 45 42 50)
      const webpSignature = buffer.toString('hex', 8, 12).toUpperCase();
      return webpSignature === '57454250';
    }

    return false;
  }
}
