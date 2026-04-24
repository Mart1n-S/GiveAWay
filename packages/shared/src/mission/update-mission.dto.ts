import { z } from "zod";
import {
  CreateMissionBaseSchema,
  applyMissionBusinessRules,
} from "./create-mission.dto";

export const UpdateMissionSchema = CreateMissionBaseSchema.partial()
  .extend({
    // Remove the .default(true) so that omitting hasRegistration yields undefined
    // (not true), preventing the volunteers rule from firing unexpectedly.
    hasRegistration: z
      .preprocess((val) => val === "true" || val === true, z.boolean())
      .optional(),
  })
  .superRefine((data, ctx) => applyMissionBusinessRules(data, ctx, { partial: true }));

export type UpdateMissionDto = z.output<typeof UpdateMissionSchema>;
export type UpdateMissionFormValues = z.input<typeof UpdateMissionSchema>;
