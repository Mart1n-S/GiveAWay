import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import {
  NO_HTML_TAGS,
  NAME_REGEX,
  formatFirstName as FORMAT_FIRST_NAME,
} from "../auth/auth.constants";
import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "./availability.enums";

export const UpdateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, { message: "Le prénom est trop court (2 caractères minimum)" })
    .max(50, { message: "Le prénom est trop long (50 caractères maximum)" })
    .regex(NAME_REGEX, {
      message:
        "Le prénom doit contenir uniquement des lettres, espaces, tirets ou apostrophes",
    })
    .transform(FORMAT_FIRST_NAME)
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
    .transform((val) => val.toUpperCase())
    .optional(),

  age: z.preprocess(
    (val) => {
      if (typeof val === "number") return String(val);
      return val;
    },
    z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number(value) : undefined))
      .refine((value) => value === undefined || !Number.isNaN(value), {
        message: "L'âge doit être un nombre valide",
      })
      .refine((value) => value === undefined || Number.isInteger(value), {
        message: "L'âge doit être un nombre entier",
      })
      .refine((value) => value === undefined || value >= 18, {
        message: "Vous devez avoir au moins 18 ans",
      })
      .refine((value) => value === undefined || value <= 100, {
        message: "Veuillez entrer un âge valide inférieur à 100 ans",
      }),
  ),

  biography: z
    .string()
    .trim()
    .max(1000, {
      message: "La biographie est trop longue (1000 caractères maximum)",
    })
    .regex(NO_HTML_TAGS, {
      message: "La biographie contient des caractères interdits (< ou >)",
    })
    .nullable()
    .optional(),

  profilePicture: z.string().nullable().optional(),

  address: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, AddressSchema.optional())
    .optional(),

  availability: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z
        .object({
          frequency: z
            .array(
              z.nativeEnum(AvailabilityFrequency, {
                message: "Fréquence de disponibilité invalide",
              }),
            )
            .min(1, { message: "Sélectionnez au moins une fréquence" })
            .optional(),
          timeSlots: z
            .array(
              z.nativeEnum(AvailabilityTime, {
                message: "Créneau horaire invalide",
              }),
            )
            .min(1, { message: "Sélectionnez au moins un créneau" })
            .optional(),
          type: z
            .nativeEnum(AvailabilityType, {
              message: "Type de disponibilité invalide",
            })
            .optional(),
        })
        .optional(),
    )
    .optional(),

  skillIds: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z
        .array(
          z.number().int().positive({
            message: "L'identifiant de compétence est invalide",
          }),
        )
        .optional(),
    )
    .optional(),

  causeIds: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z
        .array(
          z.number().int().positive({
            message: "L'identifiant de cause est invalide",
          }),
        )
        .optional(),
    )
    .optional(),
});

export type UpdateProfileFormValues = z.input<typeof UpdateProfileSchema>;
export type UpdateProfileDto = z.output<typeof UpdateProfileSchema>;
