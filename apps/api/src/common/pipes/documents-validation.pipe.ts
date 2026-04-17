import {
  PipeTransform,
  Injectable,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class DocumentsValidationPipe implements PipeTransform {
  constructor(
    private readonly isRequired: boolean = false,
    private readonly maxSizePerFile: number = 10 * 1024 * 1024, // 10 Mo par fichier
    private readonly maxFiles: number = 10,
  ) {}

  transform(
    files: Express.Multer.File[] | undefined,
  ): Express.Multer.File[] | undefined {
    try {
      if (!files || files.length === 0) {
        if (this.isRequired) {
          throw new UnprocessableEntityException(
            'Au moins un document justificatif est requis.',
          );
        }
        return undefined;
      }

      if (files.length > this.maxFiles) {
        throw new UnprocessableEntityException(
          `Trop de documents (maximum ${this.maxFiles} fichiers autorisés).`,
        );
      }

      for (const file of files) {
        this.validateSingleFile(file);
      }

      return files;
    } catch (error) {
      if (
        error instanceof UnprocessableEntityException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnprocessableEntityException(
        'Impossible de valider les documents.',
      );
    }
  }

  private validateSingleFile(file: Express.Multer.File): void {
    // 1. Taille maximale
    if (file.size > this.maxSizePerFile) {
      const maxMB = this.maxSizePerFile / (1024 * 1024);
      throw new UnprocessableEntityException(
        `Le fichier "${file.originalname}" dépasse la taille maximale (${maxMB} Mo).`,
      );
    }

    // 2. Taille minimale (éviter les fichiers vides / corrompus)
    if (file.size < 12) {
      throw new UnprocessableEntityException(
        `Le fichier "${file.originalname}" est invalide (trop petit).`,
      );
    }

    // 3. Validation par Magic Numbers (signature binaire réelle)
    if (!this.validateFileSignature(file.buffer)) {
      throw new UnprocessableEntityException(
        `Le fichier "${file.originalname}" a un format invalide. Formats acceptés : PDF, JPG, PNG, WEBP.`,
      );
    }

    // 4. Vérification du MIME type (défense en profondeur)
    const validMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!validMimeTypes.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        `Le fichier "${file.originalname}" a un type non autorisé. Formats acceptés : PDF, JPG, PNG, WEBP.`,
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

    const header = buffer.toString('hex', 0, 4).toUpperCase();

    // PDF : 25 50 44 46 ("%PDF")
    if (header === '25504446') {
      return true;
    }

    // JPEG : FF D8 FF xx
    if (header.startsWith('FFD8FF')) {
      return true;
    }

    // PNG : 89 50 4E 47
    if (header === '89504E47') {
      return true;
    }

    // WEBP : commence par "RIFF" (52 49 46 46) + "WEBP" aux octets 8-12
    if (header === '52494646') {
      if (buffer.length < 12) {
        return false;
      }
      return buffer.toString('hex', 8, 12).toUpperCase() === '57454250';
    }

    return false;
  }
}
