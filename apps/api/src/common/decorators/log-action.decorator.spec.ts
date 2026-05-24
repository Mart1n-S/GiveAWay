import 'reflect-metadata';
import { AdminLogAction } from '@repo/shared';
import { LOG_ACTION_KEY, LogAction } from './log-action.decorator';

describe('LogAction decorator', () => {
  it('Doit poser action + entityType + entityIdParam (défaut "id")', () => {
    class TestController {
      @LogAction(AdminLogAction.VALIDATE_ASSOCIATION, 'ASSOCIATION')
      validate() {}
    }
    const meta = Reflect.getMetadata(
      LOG_ACTION_KEY,
      TestController.prototype.validate,
    );
    expect(meta).toEqual({
      action: AdminLogAction.VALIDATE_ASSOCIATION,
      entityType: 'ASSOCIATION',
      entityIdParam: 'id',
    });
  });

  it('Doit accepter un entityIdParam custom', () => {
    class TestController {
      @LogAction(AdminLogAction.UPDATE_USER, 'USER', 'userId')
      update() {}
    }
    const meta = Reflect.getMetadata(
      LOG_ACTION_KEY,
      TestController.prototype.update,
    );
    expect(meta.entityIdParam).toBe('userId');
  });
});
