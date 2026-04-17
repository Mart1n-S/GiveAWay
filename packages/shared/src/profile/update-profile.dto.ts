import { z } from "zod";
import { AddressSchema } from "../address/address.dto";
import { NO_HTML_TAGS } from "../auth/auth.constants";
import { BaseUserSchema, preprocessAddress } from "../auth/register.dto";
import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "./availability.enums";

export const UpdateProfileSchema = BaseUserSchema.pick({
  firstName: true,
  lastName: true,
  age: true,
}).extend({
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

  address: z.preprocess(preprocessAddress, AddressSchema),

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
            .optional(),
          timeSlots: z
            .array(
              z.nativeEnum(AvailabilityTime, {
                message: "Créneau horaire invalide",
              }),
            )
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
          z
            .number({ message: "L'identifiant doit être un nombre" })
            .int()
            .positive({
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
          z
            .number({ message: "L'identifiant doit être un nombre" })
            .int()
            .positive({
              message: "L'identifiant de cause est invalide",
            }),
        )
        .optional(),
    )
    .optional(),

  removeProfilePicture: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().optional(),
  ),
});

export type UpdateProfileFormValues = z.input<typeof UpdateProfileSchema>;
export type UpdateProfileDto = z.output<typeof UpdateProfileSchema>;
