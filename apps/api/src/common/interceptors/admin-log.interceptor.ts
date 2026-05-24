import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LOG_ACTION_KEY,
  LogActionMeta,
} from '../decorators/log-action.decorator';

@Injectable()
export class AdminLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<LogActionMeta | undefined>(
      LOG_ACTION_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle();

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: number } }>();
    const adminId = req.user?.id;

    if (!adminId) return next.handle();

    return next.handle().pipe(
      tap((response: unknown) => {
        const params = req.params as Record<string, string>;
        const idParam = meta.entityIdParam ?? 'id';
        const rawId = params?.[idParam];
        const entityId = rawId ? Number.parseInt(rawId, 10) : 0;

        // Try to grab id from response if not in params
        const finalEntityId =
          entityId ||
          (response &&
          typeof response === 'object' &&
          'id' in (response as Record<string, unknown>)
            ? Number((response as Record<string, unknown>).id)
            : 0);

        const safeBody = this.sanitize(req.body);

        this.prisma.adminLog
          .create({
            data: {
              adminId,
              action: meta.action,
              entityType: meta.entityType,
              entityId: finalEntityId || 0,
              details: structuredClone({
                http: { method: req.method, url: req.originalUrl },
                params,
                body: safeBody,
                response: this.sanitize(response),
              }) as unknown as Prisma.InputJsonValue,
            },
          })
          .catch((err) => this.logger.error('AdminLog write failed', err));
      }),
    );
  }

  private sanitize(input: unknown): unknown {
    if (!input || typeof input !== 'object') return input;
    const SENSITIVE = new Set([
      'password',
      'currentPassword',
      'newPassword',
      'tempPassword',
      'token',
      'refreshToken',
      'accessToken',
      'hashedToken',
      'password_hash',
    ]);
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE.has(k)) {
        clone[k] = '[REDACTED]';
      } else if (v && typeof v === 'object') {
        clone[k] = this.sanitize(v);
      } else {
        clone[k] = v;
      }
    }
    return clone;
  }
}
