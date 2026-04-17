import { z } from "zod";
import { AssociationRole } from "../user/user.enums";

// Input (Requête API) — mise à jour du rôle d'un membre
// OWNER ne peut pas être assigné via ce DTO (transfert via /transfer-owner uniquement)
export const UpdateMemberRoleSchema = z.object({
  role: z.enum(
    [AssociationRole.ADMIN, AssociationRole.EDITOR] as [
      AssociationRole.ADMIN,
      AssociationRole.EDITOR,
    ],
    { message: "Le rôle doit être ADMIN ou EDITOR" },
  ),
});

export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;
