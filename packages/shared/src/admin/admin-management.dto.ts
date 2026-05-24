import { z } from "zod";
import { AdminRole } from "./admin.enums";

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s\-']+$/;

export const CreateAdminSchema = z.object({
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
  role: z.enum([AdminRole.ADMIN, AdminRole.SUPER_ADMIN], {
    message: "Le rôle doit être ADMIN ou SUPER_ADMIN",
  }),
});

export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;

export const UpdateAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Format d'email invalide" }))
    .optional(),
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
  role: z.enum([AdminRole.ADMIN, AdminRole.SUPER_ADMIN]).optional(),
});

export type UpdateAdminDto = z.infer<typeof UpdateAdminSchema>;
