import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Ip,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { TokenService } from './token.service';
import { CookieService } from '../shared/cookie.service';
import { buildAuthResponse } from '../shared/token-response.helper';

@Controller('auth')
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly cookieService: CookieService,
  ) {}

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ) {
    const tokens = await this.tokenService.refreshTokens(
      req.user.sub,
      req.user.refreshToken,
      `${req.headers['user-agent'] || 'Unknown'}`,
      ip,
    );

    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return buildAuthResponse(
      clientType,
      undefined, // pas d'user sur le refresh
      tokens.accessToken,
      tokens.refreshToken,
      'Session rafraîchie',
    );
  }
}
