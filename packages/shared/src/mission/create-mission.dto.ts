import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import {
  ACTIVITY_TYPES,
  MISSION_FREQUENCIES,
  MISSION_AVAILABILITY_TYPES,
} from "./mission.enums";

const toOptionalNumber = (val: unknown) =>
  val === undefined || val === "" ? undefined : Number(val);

const toJsonArray = (val: unknown) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// 1. Définition du schéma de base (SANS le superRefine)
export const CreateMissionBaseSchema = z.object({
  title: z
    .string({ error: "Le titre est obligatoire" })
    .trim()
    .min(3, { message: "Le titre doit faire au moins 3 caractères" })
    .max(150, { message: "Le titre est trop long (150 caractères maximum)" }),

  description: z
    .string({ error: "La description est obligatoire" })
    .trim()
    .min(20, { message: "La description doit faire au moins 20 caractères" })
    .max(5000, {
      message: "La description est trop longue (5000 caractères maximum)",
    }),

  type: z.enum(ACTIVITY_TYPES, { error: "Type d'activité invalide" }),

  availabilityType: z
    .preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z
        .enum(MISSION_AVAILABILITY_TYPES, {
          error: "Type de disponibilité invalide",
        })
        .optional(),
    )
    .optional(),

  hasRegistration: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(true),

  volunteersNeeded: z.preprocess(
    toOptionalNumber,
    z
      .number({ error: "Veuillez entrer un nombre entier valide" })
      .int({ message: "Veuillez entrer un nombre entier valide" })
      .min(1, { message: "Minimum 1 bénévole" })
      .optional(),
  ),

  durationInt: z.preprocess(
    toOptionalNumber,
    z
      .number({ error: "Veuillez entrer une durée valide" })
      .min(0.5, { message: "La durée doit être d'au moins 30 minutes (0,5h)" })
      .max(14400, {
        message: "La durée ne peut pas dépasser 240 heures",
      })
      .optional(),
  ),

  frequency: z
    .enum(MISSION_FREQUENCIES, { error: "Fréquence invalide" })
    .optional()
    .nullable(),

  startDate: z
    .string()
    .datetime({ message: "Format de date invalide (ISO 8601 attendu)" })
    .optional()
    .nullable(),

  endDate: z
    .string()
    .datetime({ message: "Format de date invalide (ISO 8601 attendu)" })
    .optional()
    .nullable(),

  address: z.preprocess(toJsonArray, AddressSchema).optional().nullable(),

  skillIds: z
    .preprocess(toJsonArray, z.array(z.number().int().positive()).optional())
    .optional(),

  causeIds: z
    .preprocess(toJsonArray, z.array(z.number().int().positive()).optional())
    .optional(),

  publicTypeIds: z
    .preprocess(toJsonArray, z.array(z.number().int().positive()).optional())
    .optional(),

  volunteerTypeIds: z
    .preprocess(toJsonArray, z.array(z.number().int().positive()).optional())
    .optional(),
});

// ─── Règles métier transverses (DRY entre CREATE et UPDATE) ────────
// `partial = true` → appliqué sur UpdateMissionSchema (certains champs peuvent être undefined)

const DEFAULT_RULES_OPTIONS = { partial: false };

export function applyMissionBusinessRules(
  data: Partial<z.infer<typeof CreateMissionBaseSchema>>,
  ctx: z.RefinementCtx,
  { partial }: { partial: boolean } = DEFAULT_RULES_OPTIONS,
): void {
  const type = data.type;
  const availability = data.availabilityType;

  // ── Règles selon le type d'activité ─────────────────────────────
  if (type === "INFO") {
    if (availability != null) {
      ctx.addIssue({
        code: "custom",
        path: ["availabilityType"],
        message: "Une information n'a pas de modalité (laissez vide)",
      });
    }
  } else if (type === "COLLECT") {
    if (availability != null && availability !== "ON_SITE") {
      ctx.addIssue({
        code: "custom",
        path: ["availabilityType"],
        message: "Une collecte doit être en présentiel uniquement",
      });
    }
  }

  // ── Modalité obligatoire pour tous les types sauf INFO (création uniquement) ──
  if (!partial && type !== undefined && type !== "INFO" && availability == null) {
    ctx.addIssue({
      code: "custom",
      path: ["availabilityType"],
      message:
        "Veuillez sélectionner une modalité (présentiel, à distance ou hybride)",
    });
  }

  // ── Nombre de bénévoles obligatoire si inscription requise (MISSION / EVENT uniquement) ──
  if (
    data.hasRegistration === true &&
    data.volunteersNeeded == null &&
    (type === "MISSION" || type === "EVENT")
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["volunteersNeeded"],
      message: "Veuillez préciser le nombre de bénévoles souhaité",
    });
  }

  // ── startDate obligatoire pour les missions non-INFO ──────────────
  if (type !== undefined && type !== "INFO") {
    if (!partial && data.startDate == null) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "La date de début est obligatoire pour ce type de mission",
      });
    } else if (partial && data.startDate === null) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "La date de début ne peut pas être supprimée",
      });
    }
  }

  // ── Adresse obligatoire pour ON_SITE / HYBRID ──────────────────
  // En mode édition (partial), si on ne modifie pas la modalité, on ne force rien.
  const defaultAvailability = type === "INFO" ? undefined : "ON_SITE";
  const resolvedAvailability = partial
    ? availability
    : (availability ?? defaultAvailability);

  if (
    resolvedAvailability &&
    (resolvedAvailability === "ON_SITE" || resolvedAvailability === "HYBRID") &&
    data.address == null
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["address"],
      message:
        "L'adresse est obligatoire pour une mission en présentiel (par défaut) ou hybride",
    });
  }

  // ── Dates ne peuvent pas être dans le passé ──────────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  if (data.startDate && new Date(data.startDate) < todayStart) {
    ctx.addIssue({
      code: "custom",
      path: ["startDate"],
      message: "La date de début ne peut pas être dans le passé",
    });
  }

  if (data.endDate && new Date(data.endDate) < todayStart) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "La date de fin ne peut pas être dans le passé",
    });
  }

  // ── Cohérence des dates ─────────────────────────────────────────
  if (data.startDate && data.endDate) {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La date de fin doit être postérieure à la date de début",
      });
    }
  }
}

// 2. Schéma final pour la création (AVEC le superRefine)
export const CreateMissionSchema = CreateMissionBaseSchema.superRefine(
  (data, ctx) => applyMissionBusinessRules(data, ctx, { partial: false }),
);

export type CreateMissionDto = z.output<typeof CreateMissionSchema>;
export type CreateMissionFormValues = z.input<typeof CreateMissionSchema>;
