import { z } from "zod";
import {
  CreateMissionBaseSchema,
  applyMissionBusinessRules,
} from "./create-mission.dto";

export const UpdateMissionSchema = CreateMissionBaseSchema.partial().superRefine(
  (data, ctx) => applyMissionBusinessRules(data, ctx, { partial: true }),
);

export type UpdateMissionDto = z.output<typeof UpdateMissionSchema>;
export type UpdateMissionFormValues = z.input<typeof UpdateMissionSchema>;
