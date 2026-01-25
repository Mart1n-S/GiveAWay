import { z } from "zod";

// Regex simple pour éviter les injections HTML basiques (< et >)
const NO_HTML_TAGS = /^[^<>]*$/;

export const AddressSchema = z
  .object({
    street: z
      .string()
      .trim()
      .min(1, "L'adresse est obligatoire")
      .min(3, "L'adresse est trop courte (3 caractères minimum)")
      .max(255, "L'adresse est trop longue (255 caractères maximum)")
      .regex(
        NO_HTML_TAGS,
        "L'adresse contient des caractères interdits (< ou >)",
      ),

    postalCode: z
      .string()
      .trim()
      .min(1, "Le code postal est obligatoire")
      .regex(
        /^\d{5}$/,
        "Le code postal doit contenir exactement 5 chiffres (ex: 75001)",
      ),

    city: z
      .string()
      .trim()
      .min(1, "La ville est obligatoire")
      .min(2, "Le nom de la ville est trop court (2 caractères minimum)")
      .max(100, "Le nom de la ville est trop long (100 caractères maximum)")
      .regex(
        NO_HTML_TAGS,
        "La ville contient des caractères interdits (< ou >)",
      ),
      
    latitude: z.preprocess(
      (val) => (typeof val === "string" ? parseFloat(val) : val),
      z.number().min(-90).max(90).optional(),
    ),

    longitude: z.preprocess(
      (val) => (typeof val === "string" ? parseFloat(val) : val),
      z.number().min(-180).max(180).optional(),
    ),
  })
  .transform((data) => ({
    ...data,
    // Si lat ou long manque, on force les deux à undefined pour ne rien enregistrer en base
    ...(data.latitude !== undefined && data.longitude !== undefined
      ? {}
      : { latitude: undefined, longitude: undefined }),
  }));

export type AddressDto = z.infer<typeof AddressSchema>;
