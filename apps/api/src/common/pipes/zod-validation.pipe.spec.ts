import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    email: z.email(),
    age: z.number().min(18),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  const meta = (type: ArgumentMetadata['type']): ArgumentMetadata => ({
    type,
    metatype: undefined,
    data: undefined,
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────
  // Validation sur body / query
  // ────────────────────────────────────────────────────────────
  it('✅ Doit retourner les données si elles sont valides (body)', () => {
    const validData = { email: 'test@example.com', age: 25 };
    expect(pipe.transform(validData, meta('body'))).toEqual(validData);
  });

  it('✅ Doit valider et coercer les query params', () => {
    const querySchema = z.object({
      limit: z.coerce.number().int().max(100).default(20),
    });
    const queryPipe = new ZodValidationPipe(querySchema);
    const result = queryPipe.transform({ limit: '50' }, meta('query')) as {
      limit: number;
    };
    expect(result.limit).toBe(50);
  });

  it('❌ Doit lever BadRequestException si données invalides (body)', () => {
    const invalid = { email: 'pas-un-email', age: 10 };

    try {
      pipe.transform(invalid, meta('body'));
      fail('Le pipe aurait dû jeter une erreur');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: unknown;
      };
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeDefined();
    }
  });

  it('❌ Doit échouer si des champs requis sont manquants', () => {
    expect(() =>
      pipe.transform({ email: 'test@example.com' }, meta('body')),
    ).toThrow(BadRequestException);
  });

  // ────────────────────────────────────────────────────────────
  // Bypass : route params (:id) et décorateurs custom
  // ────────────────────────────────────────────────────────────
  it("⏭️ Doit ignorer le type 'param' (:id de route) et retourner la valeur brute", () => {
    // Sans bypass, valider un nombre avec testSchema (qui attend un objet)
    // lèverait BadRequestException.
    expect(pipe.transform(42, meta('param'))).toBe(42);
    expect(pipe.transform('abc', meta('param'))).toBe('abc');
  });

  it("⏭️ Doit ignorer le type 'custom' (@CurrentAdmin etc.)", () => {
    const adminPayload = { id: 1, email: 'admin@gmail.com', role: 'ADMIN' };
    expect(pipe.transform(adminPayload, meta('custom'))).toEqual(adminPayload);
  });

  it('✅ Sans metadata fournie, comportement = validation (rétro-compat)', () => {
    const validData = { email: 'test@example.com', age: 25 };
    expect(pipe.transform(validData)).toEqual(validData);
  });
});
