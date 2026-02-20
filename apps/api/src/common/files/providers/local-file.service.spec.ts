import { Test, TestingModule } from '@nestjs/testing';
import { LocalFileService } from './local-file.service';
import * as fs from 'node:fs';
import { InternalServerErrorException } from '@nestjs/common';

// Mock complet du module fs
jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('LocalFileService', () => {
  let service: LocalFileService;

  const mockFile = {
    originalname: 'test.png',
    buffer: Buffer.from('fake-image-content'),
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalFileService],
    }).compile();

    service = module.get<LocalFileService>(LocalFileService);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it("✅ devrait créer le dossier s'il n'existe pas et sauvegarder le fichier", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFile(mockFile, 'avatars');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(result.publicId).toContain('avatars/');
      expect(result.url).toContain('http://localhost:3000/uploads/avatars/');
    });

    it("❌ devrait throw une InternalServerErrorException en cas d'erreur d'écriture", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(
        new Error('Disk Full'),
      );

      await expect(service.uploadFile(mockFile, 'avatars')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteFile', () => {
    it("✅ devrait supprimer le fichier s'il existe", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteFile('avatars/photo.jpg');

      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it("⚠️ ne devrait rien faire mais loguer si le fichier n'existe pas", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.deleteFile('avatars/missing.jpg');

      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });

    it("❌ devrait loguer l'erreur sans crash si la suppression échoue", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.unlink as jest.Mock).mockRejectedValue(
        new Error('Permission Denied'),
      );

      // On vérifie que ça ne throw pas (try/catch dans le service)
      await expect(
        service.deleteFile('avatars/photo.jpg'),
      ).resolves.not.toThrow();
    });
  });
});
