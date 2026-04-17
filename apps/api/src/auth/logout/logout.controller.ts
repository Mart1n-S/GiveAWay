import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { LogoutService } from './logout.service';

@Controller('auth')
export class LogoutController {
  constructor(private readonly logoutService: LogoutService) {}

  // Route: POST /auth/logout
  @Throttle({ default: { limit: 5, ttl: 5 * 60 * 1000 } }) // 5 déconnexions par 5 min max (pour éviter les abus)
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const userId = req.user.id;

    const refreshToken = req.cookies['refresh_token'] || body.refreshToken;

    if (userId && refreshToken) {
      await this.logoutService.logout(userId, refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Déconnecté avec succès' };
  }
}
