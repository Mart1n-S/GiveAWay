import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AssociationRole } from '../../generated/prisma/client';
import { ASSOCIATION_ROLES_KEY } from './association-roles.decorator';
import { AssociationAuthenticatedRequest } from './association-member.guard';

/**
 * Vérifie que le rôle de l'utilisateur dans l'association (attaché par AssociationMemberGuard)
 * correspond aux rôles requis définis par @AssociationRoles(...).
 *
 * Doit être appliqué APRÈS AssociationMemberGuard.
 */
@Injectable()
export class AssociationRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AssociationRole[]>(
      ASSOCIATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<AssociationAuthenticatedRequest>();

    const userRole: AssociationRole = req.associationRole;

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits nécessaires pour cette action",
      );
    }

    return true;
  }
}
