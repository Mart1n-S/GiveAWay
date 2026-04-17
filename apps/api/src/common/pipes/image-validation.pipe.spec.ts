import { ImageValidationPipe } from './image-validation.pipe';
import { UnprocessableEntityException } from '@nestjs/common';

describe('ImageValidationPipe', () => {
  let pipe: ImageValidationPipe;

  beforeEach(() => {
    pipe = new ImageValidationPipe();
  });

  describe('Validation de présence et taille', () => {
    it('✅ devrait passer si aucun fichier et non requis', () => {
      expect(pipe.transform(undefined)).toBeUndefined();
    });

    it('❌ devrait échouer si aucun fichier et requis', () => {
      const requiredPipe = new ImageValidationPipe(true);
      expect(() => requiredPipe.transform(undefined)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ devrait échouer si le fichier est trop lourd (ex: 6Mo)', () => {
      const largeFile = { size: 6 * 1024 * 1024 } as Express.Multer.File;
      expect(() => pipe.transform(largeFile)).toThrow('trop volumineuse');
    });

    it('❌ devrait échouer si le fichier est trop petit (< 12 octets)', () => {
      const smallFile = { size: 5 } as Express.Multer.File;
      expect(() => pipe.transform(smallFile)).toThrow('trop petit');
    });
  });

  describe('Validation des signatures (Magic Numbers)', () => {
    it('✅ devrait valider un JPEG (FF D8 FF)', () => {
      const file = {
        size: 100,
        mimetype: 'image/jpeg',
        buffer: Buffer.from('FFD8FFE0', 'hex'),
      } as Express.Multer.File;
      expect(pipe.transform(file)).toBe(file);
    });

    it('✅ devrait valider un PNG (89 50 4E 47)', () => {
      const file = {
        size: 100,
        mimetype: 'image/png',
        buffer: Buffer.from('89504E47', 'hex'),
      } as Express.Multer.File;
      expect(pipe.transform(file)).toBe(file);
    });

    it('✅ devrait valider un WEBP (RIFF...WEBP)', () => {
      const buffer = Buffer.alloc(12);
      buffer.write('RIFF', 0);
      buffer.write('WEBP', 8);

      const file = {
        size: 100,
        mimetype: 'image/webp',
        buffer: buffer,
      } as Express.Multer.File;
      expect(pipe.transform(file)).toBe(file);
    });

    it('❌ devrait échouer si la signature est invalide', () => {
      const file = {
        size: 100,
        mimetype: 'image/jpeg',
        buffer: Buffer.from('00000000', 'hex'),
      } as Express.Multer.File;
      expect(() => pipe.transform(file)).toThrow('Format invalide');
    });
  });

  describe('Gestion des erreurs inattendues', () => {
    it('❌ devrait lancer une erreur générique en cas de crash interne', () => {
      const mockFileWithCrash = {
        size: 100,
        get buffer() {
          throw new Error('Crash Simulation');
        },
      } as unknown as Express.Multer.File;

      expect(() => pipe.transform(mockFileWithCrash)).toThrow(
        'Impossible de valider le fichier.',
      );
    });
  });
});
