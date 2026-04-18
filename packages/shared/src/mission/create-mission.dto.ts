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
    .enum(MISSION_AVAILABILITY_TYPES, {
      error: "Type de disponibilité invalide",
    })
    .optional()
    .nullable(),

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

  address: z
    .preprocess(toJsonArray, AddressSchema)
    .optional()
    .nullable(),

  skillIds: z
    .preprocess(
      toJsonArray,
      z.array(z.number().int().positive()).optional(),
    )
    .optional(),

  causeIds: z
    .preprocess(
      toJsonArray,
      z.array(z.number().int().positive()).optional(),
    )
    .optional(),

  publicTypeIds: z
    .preprocess(
      toJsonArray,
      z.array(z.number().int().positive()).optional(),
    )
    .optional(),

  volunteerTypeIds: z
    .preprocess(
      toJsonArray,
      z.array(z.number().int().positive()).optional(),
    )
    .optional(),
});

// ─── Règles métier transverses (DRY entre CREATE et UPDATE) ────────
// `partial = true` → appliqué sur UpdateMissionSchema (certains champs peuvent être undefined)

export function applyMissionBusinessRules(
  data: Partial<z.infer<typeof CreateMissionBaseSchema>>,
  ctx: z.RefinementCtx,
  { partial }: { partial: boolean } = { partial: false },
): void {
  const type = data.type;
  const availability = data.availabilityType;

  // ── Règles selon le type d'activité ─────────────────────────────
  if (type === "INFO") {
    // Une information ne doit pas avoir de modalité
    if (availability != null) {
      ctx.addIssue({
        code: "custom",
        path: ["availabilityType"],
        message:
          "Une information n'a pas de modalité (laissez vide)",
      });
    }
  } else if (type === "COLLECT") {
    // Une collecte implique un lieu physique → seul EN_SITE autorisé
    if (availability != null && availability !== "ON_SITE") {
      ctx.addIssue({
        code: "custom",
        path: ["availabilityType"],
        message: "Une collecte doit être en présentiel uniquement",
      });
    }
    if (!partial && availability == null) {
      ctx.addIssue({
        code: "custom",
        path: ["availabilityType"],
        message: "La modalité est obligatoire pour une collecte",
      });
    }
  } else if (type === "MISSION" || type === "EVENT") {
    // Missions / événements → availabilityType requis en création
    if (!partial && availability == null) {
      ctx.addIssue({
        code: "custom",
        path: ["availabilityType"],
        message: "La modalité est obligatoire",
      });
    }
  }

  // ── Adresse obligatoire pour ON_SITE / HYBRID ──────────────────
  if (
    availability &&
    (availability === "ON_SITE" || availability === "HYBRID") &&
    data.address == null
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["address"],
      message:
        "L'adresse est obligatoire pour une mission en présentiel ou hybride",
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
