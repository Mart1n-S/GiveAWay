import { z } from "zod";

export const AdminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "L'email est obligatoire" })
    .pipe(z.email({ message: "Format d'email invalide" })),
  password: z.string().min(1, { message: "Le mot de passe est obligatoire" }),
});

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;

export const AdminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Mot de passe actuel requis" }),
  newPassword: z
    .string()
    .min(12, { message: "Mot de passe trop court (12 caractères min)" })
    .regex(/[A-Z]/, { message: "Doit contenir une majuscule" })
    .regex(/[a-z]/, { message: "Doit contenir une minuscule" })
    .regex(/\d/, { message: "Doit contenir un chiffre" })
    .regex(/[^A-Za-z0-9]/, { message: "Doit contenir un caractère spécial" }),
});

export type AdminChangePasswordDto = z.infer<typeof AdminChangePasswordSchema>;
