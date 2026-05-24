import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AdminRole } from '@repo/shared';
import { CurrentAdmin, CurrentAdminPayload } from './current-admin.decorator';

/**
 * Le décorateur étant un createParamDecorator, on récupère sa factory via la
 * metadata Nest puis on l'invoque manuellement avec un ExecutionContext mocké.
 */
function getDecoratorFactory(decorator: ParameterDecorator) {
  class Probe {
    method(_arg: unknown) {
      void _arg;
    }
  }
  decorator(Probe.prototype, 'method', 0);
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    'method',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  // On prend le premier (et seul) descripteur enregistré
  return Object.values(args)[0].factory;
}

describe('CurrentAdmin decorator', () => {
  it("Doit retourner request.user depuis l'ExecutionContext", () => {
    const factory = getDecoratorFactory(CurrentAdmin());
    const expected: CurrentAdminPayload = {
      id: 1,
      email: 'admin@gmail.com',
      role: AdminRole.ADMIN,
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: expected }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, ctx);
    expect(result).toEqual(expected);
  });
});
