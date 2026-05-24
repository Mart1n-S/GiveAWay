import 'reflect-metadata';
import { AdminRole } from '@repo/shared';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it("Doit poser la metadata 'roles' avec les rôles fournis", () => {
    class TestController {
      @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
      handler() {}
    }
    const meta = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.handler,
    );
    expect(meta).toEqual([AdminRole.ADMIN, AdminRole.SUPER_ADMIN]);
  });

  it('Doit accepter un seul rôle', () => {
    class TestController {
      @Roles(AdminRole.SUPER_ADMIN)
      handler() {}
    }
    const meta = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.handler,
    );
    expect(meta).toEqual([AdminRole.SUPER_ADMIN]);
  });
});
