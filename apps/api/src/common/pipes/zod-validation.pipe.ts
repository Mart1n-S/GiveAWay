import {
  ArgumentMetadata,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { ZodType, z } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, metadata?: ArgumentMetadata) {
    // Quand le pipe est attaché au niveau méthode via @UsePipes, NestJS l'exécute
    // pour CHAQUE paramètre — y compris les route params (:id) qui n'ont rien à
    // voir avec le schéma du body. On ignore donc uniquement les "param" ; les
    // pipes attachés à @Query(pipe) ou @Body(pipe) restent fonctionnels et
    // continuent de coercer les query strings via le schéma Zod.
    // Au niveau méthode (@UsePipes), NestJS exécute le pipe pour CHAQUE
    // paramètre. On ignore les route params (:id) et les paramètres injectés
    // par un décorateur custom (@CurrentAdmin, @CurrentUser, etc.) ; on ne
    // valide que les body/query, qui sont les seuls types correspondant à un
    // schéma Zod déclaré.
    if (metadata?.type === 'param' || metadata?.type === 'custom') {
      return value;
    }

    const parsed = this.schema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }

    const tree = z.treeifyError(parsed.error);

    throw new BadRequestException({
      message: 'Validation failed',
      errors: tree,
    });
  }
}
