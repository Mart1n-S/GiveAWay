import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@repo/shared';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

const buildContext = (
  user: { role?: AdminRole } | undefined,
): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('retourne true si aucun rôle requis (metadata absente)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });

  it('retourne true si tableau de rôles requis est vide', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('retourne true si le rôle de l\'utilisateur correspond', () => {
    reflector.getAllAndOverride.mockReturnValue([
      AdminRole.ADMIN,
      AdminRole.SUPER_ADMIN,
    ]);
    expect(
      guard.canActivate(buildContext({ role: AdminRole.SUPER_ADMIN })),
    ).toBe(true);
  });

  it('throw ForbiddenException si l\'utilisateur n\'a pas le rôle requis', () => {
    reflector.getAllAndOverride.mockReturnValue([AdminRole.SUPER_ADMIN]);
    expect(() =>
      guard.canActivate(buildContext({ role: AdminRole.ADMIN })),
    ).toThrow(ForbiddenException);
  });

  it('throw ForbiddenException si l\'utilisateur est absent (non authentifié)', () => {
    reflector.getAllAndOverride.mockReturnValue([AdminRole.ADMIN]);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('throw ForbiddenException si le rôle de l\'utilisateur est undefined', () => {
    reflector.getAllAndOverride.mockReturnValue([AdminRole.ADMIN]);
    expect(() => guard.canActivate(buildContext({}))).toThrow(
      ForbiddenException,
    );
  });
});
