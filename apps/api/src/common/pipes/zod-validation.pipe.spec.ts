import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  // 1. Création d'un schéma simple pour le test
  const testSchema = z.object({
    email: z.email(),
    age: z.number().min(18),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('✅ devrait retourner les données si elles sont valides', () => {
    const validData = { email: 'test@example.com', age: 25 };
    const result = pipe.transform(validData);
    expect(result).toEqual(validData);
  });

  it('❌ devrait lever une BadRequestException si les données sont invalides', () => {
    const invalidData = { email: 'not-an-email', age: 10 };

    try {
      pipe.transform(invalidData);
      fail('Le pipe aurait dû jeter une erreur');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;

      expect(response.message).toBe('Validation failed');
      // On vérifie simplement que l'objet d'erreurs n'est pas vide
      expect(response.errors).toBeDefined();
    }
  });

  it('❌ devrait échouer si des champs requis sont manquants', () => {
    const incompleteData = { email: 'test@example.com' };

    expect(() => pipe.transform(incompleteData)).toThrow(BadRequestException);
  });
});
