import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import { preprocessAddress } from "../auth/register.dto";
import { NAME_REGEX } from "../auth/auth.constants";

// ----------------------------------------------------------------------
// Création d'un utilisateur par un admin
// - Le mot de passe temporaire est généré côté backend et envoyé par email.
// - Pas de biographie (l'utilisateur la remplira lui-même).
// ----------------------------------------------------------------------
export const CreateUserAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "L'email est obligatoire" })
    .pipe(z.email({ message: "Format d'email invalide" })),

  firstName: z
    .string()
    .trim()
    .min(2, { message: "Le prénom est trop court (2 caractères minimum)" })
    .max(50, { message: "Le prénom est trop long (50 caractères maximum)" })
    .regex(NAME_REGEX, {
      message:
        "Le prénom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
    }),

  lastName: z
    .string()
    .trim()
    .min(2, { message: "Le nom est trop court (2 caractères minimum)" })
    .max(50, { message: "Le nom est trop long (50 caractères maximum)" })
    .regex(NAME_REGEX, {
      message:
        "Le nom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
    }),

  age: z.coerce
    .number()
    .int({ message: "L'âge doit être un nombre entier" })
    .min(18, { message: "L'utilisateur doit avoir au moins 18 ans" })
    .max(100, { message: "Veuillez entrer un âge valide inférieur à 100 ans" }),

  address: z.preprocess(preprocessAddress, AddressSchema),
});
export type CreateUserAdminDto = z.infer<typeof CreateUserAdminSchema>;

// L'admin ne peut éditer QUE le nom, prénom et biographie d'un user (modération
// de contenu inapproprié). L'email reste privé/utilisateur et l'âge ne se modifie
// pas par un tiers.
export const UpdateUserAdminSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, { message: "Le prénom est trop court (2 caractères minimum)" })
    .max(50, { message: "Le prénom est trop long (50 caractères maximum)" })
    .regex(NAME_REGEX, {
      message:
        "Le prénom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
    })
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(2, { message: "Le nom est trop court (2 caractères minimum)" })
    .max(50, { message: "Le nom est trop long (50 caractères maximum)" })
    .regex(NAME_REGEX, {
      message:
        "Le nom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
    })
    .optional(),
  biography: z
    .string()
    .trim()
    .max(1000, { message: "La biographie est trop longue (1000 caractères maximum)" })
    .optional(),
});
export type UpdateUserAdminDto = z.infer<typeof UpdateUserAdminSchema>;

export const UpdateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().max(2000).optional(),
});
export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;

export const UserListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "DELETED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z.enum(["createdAt", "email", "lastName"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type UserListQueryDto = z.infer<typeof UserListQuerySchema>;
