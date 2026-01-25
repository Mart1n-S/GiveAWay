import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryConfigProvider } from './providers/cloudinary.provider';
import { CloudinaryService } from './providers/cloudinary.service';
import { LocalFileService } from './providers/local-file.service';
import { FILE_SERVICE } from './interfaces/file-service.interface';

// @Global() permet de ne pas avoir à importer FilesModule dans chaque module (User, Auth...)
// C'est optionnel, mais pratique pour un module "common".
@Global()
@Module({
  providers: [
    // 1. On fournit les configurations et services "bruts"
    CloudinaryConfigProvider,
    CloudinaryService, // Nest l'instancie automatiquement (avec ses dépendances)
    LocalFileService, // Nest l'instancie automatiquement

    // 2. On crée le Provider Dynamique (Factory)
    {
      provide: FILE_SERVICE,
      useFactory: (
        configService: ConfigService,
        cloudinaryService: CloudinaryService,
        localFileService: LocalFileService,
      ) => {
        const storageType = configService.get<string>('STORAGE_TYPE');

        if (storageType === 'local') {
          return localFileService;
        }

        return cloudinaryService;
      },
      // IMPORTANT : On injecte les services dont la factory a besoin
      inject: [ConfigService, CloudinaryService, LocalFileService],
    },
  ],
  exports: [FILE_SERVICE],
})
export class FilesModule {}
