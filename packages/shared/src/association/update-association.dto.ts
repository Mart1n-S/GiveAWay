import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import { NO_HTML_TAGS, PHONE_REGEX } from "../auth/auth.constants";
import { preprocessAddress } from "../auth/register.dto";

/**
 * DTO de mise à jour d'une association.
 *
 * Tous les champs sont optionnels (PATCH partiel).
 * Les champs RNA et SIRET ne sont pas modifiables via cet endpoint (readonly).
 * Le logo est géré via l'upload de fichier (multipart/form-data) ou via logoUrl (suppression).
 */
export const UpdateAssociationSchema = z.object({
  // ── Champ sensible — vérification admin possible ──────────────────
  name: z
    .string()
    .trim()
    .min(1, { message: "Le nom de l'association ne peut pas être vide" })
    .min(2, {
      message: "Le nom de l'association est trop court (2 caractères minimum)",
    })
    .max(255, {
      message: "Le nom de l'association est trop long (255 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "Le nom contient des caractères interdits (< ou >)",
    })
    .optional(),

  // ── Champ sensible — vérification admin possible ──────────────────
  object: z
    .string()
    .trim()
    .min(1, { message: "L'objet de l'association ne peut pas être vide" })
    .max(500, { message: "L'objet est trop long (500 caractères maximum)" })
    .regex(NO_HTML_TAGS, {
      message: "L'objet contient des caractères interdits (< ou >)",
    })
    .optional(),

  legalStatus: z
    .string()
    .trim()
    .min(1, {
      message: "Le statut juridique ne peut pas être vide",
    })
    .max(100, {
      message: "Le statut juridique est trop long (100 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "Le statut juridique contient des caractères interdits (< ou >)",
    })
    .optional(),

  phone: z
    .string()
    .trim()
    .refine((v) => !v || PHONE_REGEX.test(v), {
      message:
        "Le numéro de téléphone doit contenir 10 chiffres et commencer par 0 (ex : 0606060606)",
    })
    .optional(),

  website: z
    .string()
    .trim()
    .refine(
      (v) => {
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "L'URL du site web est invalide" },
    )
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, {
      message: "La description est trop longue (1000 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "La description contient des caractères interdits (< ou >)",
    })
    .optional(),

  /**
   * URL du logo existant.
   * - Non fourni (undefined) : pas de changement sur le logo.
   * - Chaîne vide ("") : suppression du logo existant.
   * - Ignoré si un nouveau fichier logo est envoyé en multipart (le fichier prend le dessus).
   */
  logoUrl: z.string().optional(),

  /**
   * Liste des URLs de documents à conserver.
   * Tout document existant dont l'URL n'est pas dans cette liste sera supprimé.
   * Non fourni = aucun changement sur les documents existants.
   *
   * Peut arriver comme tableau JSON (requête JSON) ou comme chaîne JSON
   * sérialisée (multipart/form-data) — le preprocessing gère les deux cas.
   */
  documentUrls: z.preprocess(
    (v) => {
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch {
          return undefined;
        }
      }
      return v ?? undefined;
    },
    z.array(z.string()).optional(),
  ),

  address: z.preprocess(preprocessAddress, AddressSchema).optional(),
});

export type UpdateAssociationFormValues = z.input<typeof UpdateAssociationSchema>;
export type UpdateAssociationDto = z.output<typeof UpdateAssociationSchema>;
