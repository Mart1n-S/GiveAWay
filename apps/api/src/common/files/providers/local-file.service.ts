import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  IFileService,
  FileUploadResult,
  FileDownloadResult,
} from '../interfaces/file-service.interface';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class LocalFileService implements IFileService {
  private readonly logger = new Logger(LocalFileService.name);
  // On pointe vers apps/api/uploads
  private readonly uploadRoot = path.join(process.cwd(), 'uploads');

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<FileUploadResult> {
    try {
      // 1. Créer le dossier s'il n'existe pas (ex: uploads/avatars)
      const uploadPath = path.join(this.uploadRoot, folder);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      // 2. Générer un nom unique (nom d'origine sanitisé + tiret + uuid + extension)
      const ext = path.extname(file.originalname);
      const baseName = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 60);
      const filename = `${baseName}-${randomUUID()}${ext}`;
      const fullPath = path.join(uploadPath, filename);

      // 3. Écrire le fichier sur le disque
      await fs.promises.writeFile(fullPath, file.buffer);

      this.logger.log(`Fichier sauvegardé localement : ${fullPath}`);

      // 4. Construire l'URL et le publicId
      // publicId : On garde le chemin relatif (ex: "avatars/mon-image.jpg")
      const relativePath = `${folder}/${filename}`;

      // URL : On utilise une variable d'env API_URL ou localhost par défaut
      // L'URL ressemblera à : http://localhost:3000/uploads/avatars/mon-image.jpg
      const baseUrl = process.env.API_URL || 'http://localhost:3000';

      return {
        publicId: relativePath,
        url: `${baseUrl}/uploads/${relativePath}`,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload local : ${error}`);
      throw new InternalServerErrorException(
        'Erreur lors de la sauvegarde du fichier',
      );
    }
  }

  async getFileForDownload(publicId: string): Promise<FileDownloadResult> {
    const fullPath = path.join(this.uploadRoot, publicId);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Fichier introuvable : ${publicId}`);
    }

    const buffer = await fs.promises.readFile(fullPath);
    const ext = path.extname(publicId).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    const filename = path.basename(publicId);

    return { type: 'buffer', buffer, mimeType, filename };
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      // On reconstruit le chemin complet grâce au publicId (qui est le chemin relatif)
      const fullPath = path.join(this.uploadRoot, publicId);

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        this.logger.log(`Fichier supprimé localement : ${fullPath}`);
      } else {
        this.logger.warn(`Fichier introuvable pour suppression : ${fullPath}`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression locale : ${error}`);
      // On ne throw pas forcément d'erreur ici pour ne pas bloquer un rollback complet
      // si le fichier est déjà supprimé ou introuvable.
    }
  }
}
