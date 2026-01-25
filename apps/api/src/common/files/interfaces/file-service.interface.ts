// On définit une réponse standard pour ne pas dépendre du format de Cloudinary partout
export interface FileUploadResult {
  url: string;
  publicId: string; // ou 'key' pour S3, 'path' pour Local
}

export interface IFileService {
  uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<FileUploadResult>;
  deleteFile(publicId: string): Promise<void>;
}

// Token d'injection pour NestJS (C'est la clé qu'on utilisera pour demander le service)
export const FILE_SERVICE = 'FILE_SERVICE';
