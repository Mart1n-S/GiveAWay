import { z } from "zod";

export const UpdateNotificationsSchema = z
  .object({
    emailNotifications: z
      .boolean({ message: "La valeur doit être un booléen" })
      .optional(),
    matchNotifications: z
      .boolean({ message: "La valeur doit être un booléen" })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ est requis",
  });

export type UpdateNotificationsDto = z.infer<typeof UpdateNotificationsSchema>;
