// On définit une réponse standard pour ne pas dépendre du format de Cloudinary partout
export interface FileUploadResult {
  url: string;
  publicId: string; // ou 'key' pour S3, 'path' pour Local
}

export type FileDownloadResult =
  | { type: 'buffer'; buffer: Buffer; mimeType: string; filename: string }
  | { type: 'redirect'; url: string };

export interface IFileService {
  uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<FileUploadResult>;
  deleteFile(publicId: string): Promise<void>;
  /**
   * Retourne le contenu d'un fichier pour le téléchargement.
   * - type 'buffer' : le fichier est lu localement et renvoyé directement au client.
   * - type 'redirect' : une URL CDN est retournée, le contrôleur effectue une redirection.
   */
  getFileForDownload(publicId: string): Promise<FileDownloadResult>;
}

// Token d'injection pour NestJS (C'est la clé qu'on utilisera pour demander le service)
export const FILE_SERVICE = 'FILE_SERVICE';
