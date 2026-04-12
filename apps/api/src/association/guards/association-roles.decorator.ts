import { SetMetadata } from '@nestjs/common';
import { AssociationRole } from '../../generated/prisma/client';

export const ASSOCIATION_ROLES_KEY = 'associationRoles';

/**
 * Décorateur à placer sur les routes nécessitant un rôle précis au sein de l'association.
 * Doit être utilisé conjointement avec AssociationMemberGuard (qui attache le rôle)
 * et AssociationRoleGuard (qui vérifie le rôle requis).
 *
 * Exemple : @AssociationRoles(AssociationRole.OWNER, AssociationRole.ADMIN)
 */
export const AssociationRoles = (...roles: AssociationRole[]) =>
  SetMetadata(ASSOCIATION_ROLES_KEY, roles);
