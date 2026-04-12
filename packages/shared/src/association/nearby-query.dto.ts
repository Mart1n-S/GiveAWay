import { z } from "zod";

const MAX_RADIUS_KM = 50;
const DEFAULT_RADIUS_KM = 10;
const MAX_NEARBY_RESULTS = 200;

/** Convertit un query-param string/vide en number, ou undefined si absent */
const toNumber = (val: unknown) =>
  val === undefined || val === "" ? undefined : Number(val);

/** Convertit un query-param vide en undefined (passe les strings intactes) */
const emptyToUndefined = (val: unknown) =>
  val === undefined || val === "" ? undefined : val;

export const NearbyQuerySchema = z.object({
  lat: z.preprocess(
    toNumber,
    z.number({ error: "Latitude obligatoire" }).min(-90, "Latitude invalide (-90 à 90)").max(90, "Latitude invalide (-90 à 90)"),
  ),

  lng: z.preprocess(
    toNumber,
    z.number({ error: "Longitude obligatoire" }).min(-180, "Longitude invalide (-180 à 180)").max(180, "Longitude invalide (-180 à 180)"),
  ),

  radius: z.preprocess(
    toNumber,
    z.number().min(1, "Le rayon doit être d'au moins 1 km").max(MAX_RADIUS_KM, `Le rayon ne peut pas dépasser ${MAX_RADIUS_KM} km`).optional(),
  ).default(DEFAULT_RADIUS_KM),

  limit: z.preprocess(
    toNumber,
    z.number().int().min(1).max(MAX_NEARBY_RESULTS, `Maximum ${MAX_NEARBY_RESULTS} résultats`).optional(),
  ).default(MAX_NEARBY_RESULTS),

  categoryIds: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform((val) =>
        val
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0),
      )
      .optional(),
  ),

  createdAfter: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), { message: "Date invalide (createdAfter)" })
      .transform((v) => new Date(v))
      .optional(),
  ),

  createdBefore: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), { message: "Date invalide (createdBefore)" })
      .transform((v) => new Date(v))
      .optional(),
  ),
});

export type NearbyQueryDto = z.output<typeof NearbyQuerySchema>;
