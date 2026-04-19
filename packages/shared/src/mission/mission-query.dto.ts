import { z } from "zod";
import { ACTIVITY_TYPES, MISSION_FREQUENCIES } from "./mission.enums";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 12;

/** Convertit un query-param string/vide en number, ou undefined si absent */
const toNumber = (val: unknown) =>
  val === undefined || val === "" ? undefined : Number(val);

/** Convertit un query-param vide en undefined (passe les strings intactes) */
const emptyToUndefined = (val: unknown) =>
  val === undefined || val === "" ? undefined : val;

/** Parse un tableau d'entiers depuis une string CSV ou un tableau */
const toIntArray = (val: unknown) => {
  if (val === undefined || val === "") return undefined;
  if (Array.isArray(val)) {
    const nums = val.map(Number).filter((n) => !Number.isNaN(n));
    return nums.length ? nums : undefined;
  }
  if (typeof val === "string") {
    const nums = val.split(",").map(Number).filter((n) => !Number.isNaN(n));
    return nums.length ? nums : undefined;
  }
  return undefined;
};

/** Parse un tableau d'ActivityType depuis une string CSV ou un tableau */
const toActivityTypeArray = (val: unknown) => {
  if (val === undefined || val === "") return undefined;
  if (Array.isArray(val)) return val.length ? val : undefined;
  if (typeof val === "string") {
    const arr = val.split(",").filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
};

export const MissionListQuerySchema = z.object({
  page: z.preprocess(
    toNumber,
    z.number().int().min(1, "La page doit être ≥ 1").optional(),
  ).default(1),

  pageSize: z.preprocess(
    toNumber,
    z.number().int().min(1).max(MAX_PAGE_SIZE, `Maximum ${MAX_PAGE_SIZE} résultats par page`).optional(),
  ).default(DEFAULT_PAGE_SIZE),

  /** Type unique — rétro-compatibilité */
  type: z.preprocess(
    emptyToUndefined,
    z.enum(ACTIVITY_TYPES, { error: "Type d'activité invalide" }).optional(),
  ),

  /** Types multiples */
  types: z.preprocess(
    toActivityTypeArray,
    z.array(z.enum(ACTIVITY_TYPES)).optional(),
  ),

  /** Cause unique — rétro-compatibilité */
  causeId: z.preprocess(
    toNumber,
    z.number().int().min(1).optional(),
  ),

  /** Causes multiples */
  causeIds: z.preprocess(
    toIntArray,
    z.array(z.number().int().min(1)).optional(),
  ),

  city: z.preprocess(
    emptyToUndefined,
    z.string().max(100, "Nom de ville trop long").optional(),
  ),

  search: z.preprocess(
    emptyToUndefined,
    z.string().max(200, "Recherche trop longue").optional(),
  ),

  /** Compétences requises — accepte "1,2,3" (query-string) ou number[] (JSON body) */
  skillIds: z.preprocess(
    toIntArray,
    z.array(z.number().int().min(1)).optional(),
  ),

  /** Publics ciblés */
  publicTypeIds: z.preprocess(
    toIntArray,
    z.array(z.number().int().min(1)).optional(),
  ),

  /** Types de bénévoles */
  volunteerTypeIds: z.preprocess(
    toIntArray,
    z.array(z.number().int().min(1)).optional(),
  ),

  frequency: z.preprocess(
    emptyToUndefined,
    z.enum(MISSION_FREQUENCIES, { error: "Fréquence invalide" }).optional(),
  ),

  startDateFrom: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD").optional(),
  ),

  startDateTo: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD").optional(),
  ),

  hasAvailableSpots: z.preprocess(
    (val) => {
      if (val === undefined || val === "") return undefined;
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    },
    z.boolean().optional(),
  ),

  /** Mode de localisation : 'nearby' = présentiel/hybride, 'remote' = distanciel */
  locationMode: z.preprocess(
    emptyToUndefined,
    z.enum(["nearby", "remote"]).optional(),
  ),

  /** Filtre par association */
  associationId: z.preprocess(
    toNumber,
    z.number().int().min(1).optional(),
  ),
});

export type MissionListQueryDto = z.output<typeof MissionListQuerySchema>;
