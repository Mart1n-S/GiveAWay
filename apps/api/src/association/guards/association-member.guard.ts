import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AssociationRole } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

export interface AssociationAuthenticatedRequest extends AuthenticatedRequest {
  associationRole: AssociationRole;
}

/**
 * Vérifie que l'utilisateur JWT connecté est bien membre de l'association
 * identifiée par :associationId dans les paramètres de route.
 *
 * Attache `req.associationRole` avec le rôle de l'utilisateur dans l'association.
 * Doit être appliqué APRÈS AuthGuard('jwt').
 */
@Injectable()
export class AssociationMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<AssociationAuthenticatedRequest>();

    const userId = req.user?.id;
    const associationId = parseInt(req.params?.associationId, 10);

    if (!userId || isNaN(associationId)) {
      throw new ForbiddenException('Accès refusé');
    }

    const member = await this.prisma.associationUser.findFirst({
      where: { userId, associationId },
    });

    if (!member) {
      throw new ForbiddenException(
        "Vous n'êtes pas membre de cette association",
      );
    }

    // member.role est déjà AssociationRole (enum Prisma) — aucun cast intermédiaire
    req.associationRole = member.role;
    return true;
  }
}
