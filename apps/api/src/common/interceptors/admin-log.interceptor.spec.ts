import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminLogAction } from '@repo/shared';
import { lastValueFrom, of } from 'rxjs';
import { AdminLogInterceptor } from './admin-log.interceptor';
import { LOG_ACTION_KEY } from '../decorators/log-action.decorator';

interface MockRequest {
  method: string;
  originalUrl: string;
  params: Record<string, string>;
  body: Record<string, unknown>;
  user?: { id?: number };
}

const buildContext = (req: MockRequest): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
  }) as unknown as ExecutionContext;

const buildHandler = (response: unknown): CallHandler => ({
  handle: () => of(response),
});

describe('AdminLogInterceptor', () => {
  let reflector: { get: jest.Mock };
  let prisma: { adminLog: { create: jest.Mock } };
  let interceptor: AdminLogInterceptor;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    prisma = { adminLog: { create: jest.fn().mockResolvedValue({ id: 1 }) } };
    interceptor = new AdminLogInterceptor(
      reflector as unknown as Reflector,
      prisma as never,
    );
  });

  it("✅ Ne fait rien si la route n'a pas de @LogAction", async () => {
    reflector.get.mockReturnValue(undefined);
    const ctx = buildContext({
      method: 'GET',
      originalUrl: '/admin/foo',
      params: {},
      body: {},
      user: { id: 1 },
    });

    const result = await lastValueFrom(
      interceptor.intercept(ctx, buildHandler({ ok: true })),
    );

    expect(result).toEqual({ ok: true });
    expect(prisma.adminLog.create).not.toHaveBeenCalled();
  });

  it("✅ Ne loggue pas si l'admin n'est pas authentifié", async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.VALIDATE_ASSOCIATION,
      entityType: 'ASSOCIATION',
    });
    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/associations/1/validate',
      params: { id: '1' },
      body: {},
    });

    await lastValueFrom(interceptor.intercept(ctx, buildHandler({ id: 1 })));
    expect(prisma.adminLog.create).not.toHaveBeenCalled();
  });

  it("✅ Loggue l'action avec entityId issu de req.params.id", async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.VALIDATE_ASSOCIATION,
      entityType: 'ASSOCIATION',
    });
    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/associations/42/validate',
      params: { id: '42' },
      body: { extra: 'data' },
      user: { id: 7 },
    });

    await lastValueFrom(interceptor.intercept(ctx, buildHandler({ id: 42 })));

    expect(prisma.adminLog.create).toHaveBeenCalledTimes(1);
    const arg = prisma.adminLog.create.mock.calls[0][0];
    expect(arg.data.adminId).toBe(7);
    expect(arg.data.action).toBe(AdminLogAction.VALIDATE_ASSOCIATION);
    expect(arg.data.entityType).toBe('ASSOCIATION');
    expect(arg.data.entityId).toBe(42);
    expect(arg.data.details.http).toEqual({
      method: 'PATCH',
      url: '/admin/associations/42/validate',
    });
  });

  it("✅ Récupère l'entityId via response.id si le param est absent", async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.CREATE_ADMIN,
      entityType: 'ADMIN',
    });
    const ctx = buildContext({
      method: 'POST',
      originalUrl: '/admin/admins',
      params: {},
      body: {},
      user: { id: 1 },
    });

    await lastValueFrom(
      interceptor.intercept(ctx, buildHandler({ id: 99, email: 'x@y.z' })),
    );

    expect(prisma.adminLog.create.mock.calls[0][0].data.entityId).toBe(99);
  });

  it('✅ Utilise un entityIdParam custom', async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.UPDATE_USER,
      entityType: 'USER',
      entityIdParam: 'userId',
    });
    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/users/10',
      params: { userId: '10' },
      body: {},
      user: { id: 1 },
    });

    await lastValueFrom(interceptor.intercept(ctx, buildHandler({ id: 10 })));

    expect(prisma.adminLog.create.mock.calls[0][0].data.entityId).toBe(10);
  });

  it('✅ Redacte les champs sensibles du body et de la response', async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.RESET_ADMIN_PASSWORD,
      entityType: 'ADMIN',
    });
    const ctx = buildContext({
      method: 'POST',
      originalUrl: '/admin/admins/1/reset-password',
      params: { id: '1' },
      body: { currentPassword: 'oldpass', newPassword: 'NewPwd123!' },
      user: { id: 7 },
    });

    await lastValueFrom(
      interceptor.intercept(
        ctx,
        buildHandler({ tempPassword: 'TmpPwd!23', accessToken: 'jwt' }),
      ),
    );

    const data = prisma.adminLog.create.mock.calls[0][0].data;
    expect(data.details.body.currentPassword).toBe('[REDACTED]');
    expect(data.details.body.newPassword).toBe('[REDACTED]');
    expect(data.details.response.tempPassword).toBe('[REDACTED]');
    expect(data.details.response.accessToken).toBe('[REDACTED]');
  });

  it('✅ Redacte récursivement dans les objets imbriqués', async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.UPDATE_ADMIN,
      entityType: 'ADMIN',
    });
    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/admins/1',
      params: { id: '1' },
      body: { profile: { token: 'secret', name: 'Alice' } },
      user: { id: 7 },
    });

    await lastValueFrom(interceptor.intercept(ctx, buildHandler({})));

    const body = prisma.adminLog.create.mock.calls[0][0].data.details.body;
    expect(body.profile.token).toBe('[REDACTED]');
    expect(body.profile.name).toBe('Alice');
  });

  it("✅ N'interrompt pas la requête si l'écriture du log échoue", async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.VALIDATE_ASSOCIATION,
      entityType: 'ASSOCIATION',
    });
    prisma.adminLog.create.mockRejectedValueOnce(new Error('DB down'));

    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/associations/1/validate',
      params: { id: '1' },
      body: {},
      user: { id: 1 },
    });

    const result = await lastValueFrom(
      interceptor.intercept(ctx, buildHandler({ ok: true })),
    );
    // Laisse le tap async terminer son catch
    await new Promise((r) => setTimeout(r, 5));
    expect(result).toEqual({ ok: true });
  });

  it('reflector.get est appelé avec la bonne clé et le handler', () => {
    reflector.get.mockReturnValue(undefined);
    const handler = () => undefined;
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/x',
          params: {},
          body: {},
        }),
      }),
      getHandler: () => handler,
    } as unknown as ExecutionContext;

    interceptor.intercept(ctx, buildHandler(null));
    expect(reflector.get).toHaveBeenCalledWith(LOG_ACTION_KEY, handler);
  });

  it("✅ Gère un body null et une réponse null sans lever d'exception", async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.UPDATE_ADMIN,
      entityType: 'ADMIN',
    });
    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/admins/1',
      params: { id: '1' },
      body: null as unknown as Record<string, unknown>,
      user: { id: 1 },
    });

    await lastValueFrom(interceptor.intercept(ctx, buildHandler(null)));
    await new Promise((r) => setTimeout(r, 5));

    const data = prisma.adminLog.create.mock.calls[0][0].data;
    expect(data.adminId).toBe(1);
    expect(data.details.body).toBeNull();
  });

  it("✅ Gère une réponse primitive (string) sans lever d'exception", async () => {
    reflector.get.mockReturnValue({
      action: AdminLogAction.UPDATE_ADMIN,
      entityType: 'ADMIN',
    });
    const ctx = buildContext({
      method: 'PATCH',
      originalUrl: '/admin/admins/1',
      params: { id: '1' },
      body: {},
      user: { id: 1 },
    });

    await lastValueFrom(
      interceptor.intercept(ctx, buildHandler('plain-string')),
    );
    await new Promise((r) => setTimeout(r, 5));

    const data = prisma.adminLog.create.mock.calls[0][0].data;
    expect(data.details.response).toBe('plain-string');
  });
});
