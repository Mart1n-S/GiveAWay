import { AssociationRole } from "@repo/shared";
import { TagBadge } from "../tag-badge/tag-badge";
import type { TagBadgeProps } from "../tag-badge/tag-badge.types";

export interface RoleBadgeProps {
  role: AssociationRole;
  size?: TagBadgeProps["size"];
}

const roleConfig: Record<
  AssociationRole,
  { label: string; variant: TagBadgeProps["variant"] }
> = {
  [AssociationRole.OWNER]: { label: "Propriétaire", variant: "orange" },
  [AssociationRole.ADMIN]: { label: "Administrateur", variant: "blue" },
  [AssociationRole.EDITOR]: { label: "Éditeur", variant: "surface" },
};

/**
 * Badge affichant le rôle d'un membre dans une association.
 *
 * - OWNER → "Propriétaire" (orange)
 * - ADMIN → "Administrateur" (bleu)
 * - EDITOR → "Éditeur" (gris)
 */
export function RoleBadge({ role, size = "sm" }: RoleBadgeProps) {
  const { label, variant } = roleConfig[role];
  return <TagBadge label={label} variant={variant} size={size} />;
}
