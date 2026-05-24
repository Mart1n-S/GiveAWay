import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FollowStatusResponse } from '@repo/shared';

@Injectable()
export class AssociationFollowService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(userId: number, associationId: number): Promise<void> {
    await this.prisma.userAssociationFollow.upsert({
      where: { userId_associationId: { userId, associationId } },
      create: { userId, associationId },
      update: {},
    });
  }

  async unfollow(userId: number, associationId: number): Promise<void> {
    await this.prisma.userAssociationFollow.deleteMany({
      where: { userId, associationId },
    });
  }

  async getStatus(
    userId: number,
    associationId: number,
  ): Promise<FollowStatusResponse> {
    const follow = await this.prisma.userAssociationFollow.findUnique({
      where: { userId_associationId: { userId, associationId } },
    });
    return { isFollowing: follow !== null };
  }
}
