import { z } from "zod";

export const RegisterPushTokenSchema = z.object({
  pushToken: z.string().min(1),
});

export type RegisterPushTokenDto = z.infer<typeof RegisterPushTokenSchema>;
