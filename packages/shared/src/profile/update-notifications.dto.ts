import { z } from "zod";

export const UpdateNotificationsSchema = z.object({
  emailNotifications: z
    .boolean({ message: "La valeur doit être un booléen" })
    .refine((val) => typeof val === "boolean", {
      message: "emailNotifications doit être vrai ou faux",
    }),
});

export type UpdateNotificationsDto = z.infer<typeof UpdateNotificationsSchema>;
