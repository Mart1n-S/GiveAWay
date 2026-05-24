import { SetMetadata } from '@nestjs/common';
import { AdminLogAction, AdminLogEntityType } from '@repo/shared';

export const LOG_ACTION_KEY = 'logAction';

export interface LogActionMeta {
  action: AdminLogAction | string;
  entityType: AdminLogEntityType | string;
  entityIdParam?: string;
}

export const LogAction = (
  action: AdminLogAction | string,
  entityType: AdminLogEntityType | string,
  entityIdParam = 'id',
) => SetMetadata(LOG_ACTION_KEY, { action, entityType, entityIdParam });
