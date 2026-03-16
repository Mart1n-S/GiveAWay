import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '../../generated/prisma/client';
import { User } from '@repo/shared';
import { AuthService } from '../auth.service';

@Injectable()
export class MeService {
  constructor(private readonly authService: AuthService) {}

  async getMe(userId: number): Promise<User> {
    const { prisma } = this.authService;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        associations: { include: { association: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new BadRequestException('Votre compte a été supprimé ou suspendu.');
    }

    return this.authService.mapUserToResponse(user);
  }
}
