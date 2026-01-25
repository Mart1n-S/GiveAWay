import { Module, Global } from '@nestjs/common';
import { CloudinaryConfigProvider } from './providers/cloudinary.provider';
import { CloudinaryService } from './providers/cloudinary.service';
import { FILE_SERVICE } from './interfaces/file-service.interface';

// @Global() permet de ne pas avoir à importer FilesModule dans chaque module (User, Auth...)
// C'est optionnel, mais pratique pour un module "common".
@Global()
@Module({
  providers: [
    CloudinaryConfigProvider,
    {
      provide: FILE_SERVICE,
      useClass: CloudinaryService,
    },
  ],
  exports: [FILE_SERVICE], // On exporte uniquement le TOKEN générique
})
export class FilesModule {}
