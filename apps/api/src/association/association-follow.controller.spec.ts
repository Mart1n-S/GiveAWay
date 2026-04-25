import { Test, TestingModule } from '@nestjs/testing';
import { AssociationFollowController } from './association-follow.controller';
import { AssociationFollowService } from './association-follow.service';

const mockFollowService = {
  follow: jest.fn(),
  unfollow: jest.fn(),
  getStatus: jest.fn(),
};

const mockRequest = (userId: number) => ({ user: { id: userId } }) as any;

describe('AssociationFollowController', () => {
  let controller: AssociationFollowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssociationFollowController],
      providers: [
        { provide: AssociationFollowService, useValue: mockFollowService },
      ],
    }).compile();

    controller = module.get<AssociationFollowController>(
      AssociationFollowController,
    );
    jest.clearAllMocks();
  });

  // =========================================================================
  // POST :id/follow
  // =========================================================================
  describe('follow', () => {
    it('✅ appelle followService.follow avec userId et associationId', async () => {
      mockFollowService.follow.mockResolvedValue(undefined);

      await controller.follow(mockRequest(1), 10);

      expect(mockFollowService.follow).toHaveBeenCalledWith(1, 10);
    });

    it('✅ retourne void', async () => {
      mockFollowService.follow.mockResolvedValue(undefined);

      const result = await controller.follow(mockRequest(1), 10);

      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // DELETE :id/follow
  // =========================================================================
  describe('unfollow', () => {
    it('✅ appelle followService.unfollow avec userId et associationId', async () => {
      mockFollowService.unfollow.mockResolvedValue(undefined);

      await controller.unfollow(mockRequest(2), 20);

      expect(mockFollowService.unfollow).toHaveBeenCalledWith(2, 20);
    });

    it('✅ retourne void', async () => {
      mockFollowService.unfollow.mockResolvedValue(undefined);

      const result = await controller.unfollow(mockRequest(2), 20);

      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // GET :id/follow
  // =========================================================================
  describe('getStatus', () => {
    it('✅ retourne { isFollowing: true } si abonné', async () => {
      mockFollowService.getStatus.mockResolvedValue({ isFollowing: true });

      const result = await controller.getStatus(mockRequest(3), 30);

      expect(result).toEqual({ isFollowing: true });
      expect(mockFollowService.getStatus).toHaveBeenCalledWith(3, 30);
    });

    it('✅ retourne { isFollowing: false } si non abonné', async () => {
      mockFollowService.getStatus.mockResolvedValue({ isFollowing: false });

      const result = await controller.getStatus(mockRequest(3), 30);

      expect(result).toEqual({ isFollowing: false });
    });
  });
});
