import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AdminRole } from '@repo/shared';

export interface CurrentAdminPayload {
  id: number;
  email: string;
  role: AdminRole;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: CurrentAdminPayload }>();
    return request.user;
  },
);
