import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodType, z } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    // safeParse gère les erreurs sans try/catch
    const parsed = this.schema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }

    // Méthode pour structurer l'erreur
    const tree = z.treeifyError(parsed.error);

    throw new BadRequestException({
      message: 'Validation failed',
      errors: tree,
    });
  }
}
