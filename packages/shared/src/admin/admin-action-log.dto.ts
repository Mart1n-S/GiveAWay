import { z } from "zod";
import { AdminLogAction, AdminLogEntityType } from "./admin.enums";

export interface AdminLogEntry {
  id: number;
  action: AdminLogAction | string;
  entityType: AdminLogEntityType | string;
  entityId: number;
  details: unknown;
  adminId: number;
  adminEmail?: string;
  createdAt: string;
}

export const AdminLogQuerySchema = z.object({
  action: z.string().optional(),
  adminId: z.coerce.number().int().positive().optional(),
  entityType: z.string().optional(),
  entityId: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type AdminLogQueryDto = z.infer<typeof AdminLogQuerySchema>;
