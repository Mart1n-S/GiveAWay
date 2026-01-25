import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  IFileService,
  FileUploadResult,
} from '../interfaces/file-service.interface';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

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

      // 2. Générer un nom unique (uuid + extension d'origine)
      const filename = `${randomUUID()}${path.extname(file.originalname)}`;
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
