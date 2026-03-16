import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@repo/shared';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { MeService } from './me.service';

@Controller('auth')
export class MeController {
  constructor(private readonly meService: MeService) {}

  // Route: GET /auth/me
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: AuthenticatedRequest): Promise<User> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    return this.meService.getMe(req.user.id);
  }
}
