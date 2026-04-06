import { DocumentsValidationPipe } from './documents-validation.pipe';
import { UnprocessableEntityException } from '@nestjs/common';

// ----------------------------------------------------------------
// Helpers — construire des buffers avec les bons Magic Numbers
// ----------------------------------------------------------------
const makeJpeg = (): Buffer => {
  const buf = Buffer.alloc(20);
  buf.write('FFD8FFE0', 0, 'hex');
  return buf;
};

const makePng = (): Buffer => {
  const buf = Buffer.alloc(20);
  buf.write('89504E47', 0, 'hex');
  return buf;
};

const makeWebp = (): Buffer => {
  const buf = Buffer.alloc(20);
  buf.write('52494646', 0, 'hex'); // RIFF
  buf.write('57454250', 8, 'hex'); // WEBP
  return buf;
};

const makePdf = (): Buffer => {
  const buf = Buffer.alloc(20);
  buf.write('25504446', 0, 'hex'); // %PDF
  return buf;
};

const makeInvalid = (): Buffer => Buffer.alloc(20, 0x00); // 20 octets à zéro — passe la vérif taille mais aucun magic number valide

const makeFile = (
  buffer: Buffer,
  mimetype: string,
  originalname = 'doc.pdf',
): Express.Multer.File =>
  ({ buffer, mimetype, originalname, size: buffer.length }) as Express.Multer.File;

describe('DocumentsValidationPipe', () => {
  let pipe: DocumentsValidationPipe;

  beforeEach(() => {
    pipe = new DocumentsValidationPipe();
  });

  // ----------------------------------------------------------------
  // Présence / nombre
  // ----------------------------------------------------------------
  describe('Présence et nombre de fichiers', () => {
    it('✅ Doit retourner undefined si aucun fichier et non requis', () => {
      expect(pipe.transform(undefined)).toBeUndefined();
      expect(pipe.transform([])).toBeUndefined();
    });

    it('❌ Doit échouer si aucun fichier et requis', () => {
      const requiredPipe = new DocumentsValidationPipe(true);
      expect(() => requiredPipe.transform(undefined)).toThrow(
        UnprocessableEntityException,
      );
      expect(() => requiredPipe.transform(undefined)).toThrow('requis');
    });

    it('❌ Doit échouer si le nombre de fichiers dépasse le maximum', () => {
      const pipe10 = new DocumentsValidationPipe(false, 10 * 1024 * 1024, 3);
      const files = Array.from({ length: 4 }, () =>
        makeFile(makePdf(), 'application/pdf'),
      );
      expect(() => pipe10.transform(files)).toThrow('Trop de documents');
    });
  });

  // ----------------------------------------------------------------
  // Taille
  // ----------------------------------------------------------------
  describe('Validation de taille', () => {
    it('❌ Doit échouer si un fichier dépasse la taille maximale', () => {
      const bigFile = {
        buffer: makePdf(),
        mimetype: 'application/pdf',
        originalname: 'big.pdf',
        size: 11 * 1024 * 1024,
      } as Express.Multer.File;
      expect(() => pipe.transform([bigFile])).toThrow('taille maximale');
    });

    it('❌ Doit échouer si un fichier est trop petit (< 12 octets)', () => {
      const tinyFile = {
        buffer: Buffer.alloc(5),
        mimetype: 'application/pdf',
        originalname: 'tiny.pdf',
        size: 5,
      } as Express.Multer.File;
      expect(() => pipe.transform([tinyFile])).toThrow('trop petit');
    });
  });

  // ----------------------------------------------------------------
  // Magic Numbers (signatures binaires)
  // ----------------------------------------------------------------
  describe('Validation des signatures (Magic Numbers)', () => {
    it('✅ Doit valider un PDF (%PDF)', () => {
      const file = makeFile(makePdf(), 'application/pdf', 'statuts.pdf');
      expect(pipe.transform([file])).toEqual([file]);
    });

    it('✅ Doit valider un JPEG', () => {
      const file = makeFile(makeJpeg(), 'image/jpeg', 'scan.jpg');
      expect(pipe.transform([file])).toEqual([file]);
    });

    it('✅ Doit valider un PNG', () => {
      const file = makeFile(makePng(), 'image/png', 'scan.png');
      expect(pipe.transform([file])).toEqual([file]);
    });

    it('✅ Doit valider un WEBP', () => {
      const file = makeFile(makeWebp(), 'image/webp', 'scan.webp');
      expect(pipe.transform([file])).toEqual([file]);
    });

    it('✅ Doit valider plusieurs fichiers valides', () => {
      const files = [
        makeFile(makePdf(), 'application/pdf', 'a.pdf'),
        makeFile(makeJpeg(), 'image/jpeg', 'b.jpg'),
      ];
      expect(pipe.transform(files)).toEqual(files);
    });

    it('❌ Doit échouer si la signature binaire est invalide', () => {
      const file = makeFile(makeInvalid(), 'application/pdf', 'fake.pdf');
      expect(() => pipe.transform([file])).toThrow('format invalide');
    });

    it('❌ Doit inclure le nom du fichier dans le message d\'erreur', () => {
      const file = makeFile(makeInvalid(), 'application/pdf', 'mauvais-fichier.pdf');
      expect(() => pipe.transform([file])).toThrow('mauvais-fichier.pdf');
    });
  });

  // ----------------------------------------------------------------
  // MIME type
  // ----------------------------------------------------------------
  describe('Validation du MIME type', () => {
    it('❌ Doit échouer si le MIME type est interdit (ex: text/plain)', () => {
      const file = makeFile(makePdf(), 'text/plain', 'trompeur.txt');
      expect(() => pipe.transform([file])).toThrow('non autorisé');
    });

    it('❌ Doit échouer si le MIME type est application/octet-stream', () => {
      const file = makeFile(makePdf(), 'application/octet-stream', 'trompeur.bin');
      expect(() => pipe.transform([file])).toThrow('non autorisé');
    });
  });

  // ----------------------------------------------------------------
  // Gestion des erreurs inattendues
  // ----------------------------------------------------------------
  describe('Gestion des erreurs inattendues', () => {
    it('❌ Doit lancer une erreur générique en cas de crash interne', () => {
      const crashFile = {
        originalname: 'crash.pdf',
        mimetype: 'application/pdf',
        size: 100,
        get buffer(): Buffer {
          throw new Error('Crash simulation');
        },
      } as unknown as Express.Multer.File;

      expect(() => pipe.transform([crashFile])).toThrow(
        'Impossible de valider les documents.',
      );
    });
  });
});
