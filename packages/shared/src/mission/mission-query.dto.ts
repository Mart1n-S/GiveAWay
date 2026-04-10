import { z } from "zod";
import { ACTIVITY_TYPES } from "./mission.enums";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 12;

/** Convertit un query-param string/vide en number, ou undefined si absent */
const toNumber = (val: unknown) =>
  val === undefined || val === "" ? undefined : Number(val);

/** Convertit un query-param vide en undefined (passe les strings intactes) */
const emptyToUndefined = (val: unknown) =>
  val === undefined || val === "" ? undefined : val;

export const MissionListQuerySchema = z.object({
  page: z.preprocess(
    toNumber,
    z.number().int().min(1, "La page doit être ≥ 1").optional(),
  ).default(1),

  pageSize: z.preprocess(
    toNumber,
    z.number().int().min(1).max(MAX_PAGE_SIZE, `Maximum ${MAX_PAGE_SIZE} résultats par page`).optional(),
  ).default(DEFAULT_PAGE_SIZE),

  type: z.preprocess(
    emptyToUndefined,
    z.enum(ACTIVITY_TYPES, { error: "Type d'activité invalide" }).optional(),
  ),

  causeId: z.preprocess(
    toNumber,
    z.number().int().min(1).optional(),
  ),

  city: z.preprocess(
    emptyToUndefined,
    z.string().max(100, "Nom de ville trop long").optional(),
  ),

  search: z.preprocess(
    emptyToUndefined,
    z.string().max(200, "Recherche trop longue").optional(),
  ),
});

export type MissionListQueryDto = z.output<typeof MissionListQuerySchema>;
