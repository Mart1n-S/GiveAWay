import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import {
  LoginDto,
  GoogleLoginDto,
  LoginSchema,
  AuthResponse,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GuestGuard } from '../guards/guest.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { LoginService } from './login.service';

@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  // Route: POST /auth/login
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 tentatives de connexion par heure max
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ): Promise<AuthResponse> {
    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;
    return this.loginService.login(dto, res, userAgent, ip, clientType);
  }

  // Route: POST /auth/google
  @UseGuards(GuestGuard)
  @HttpCode(HttpStatus.OK)
  @Post('google')
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ): Promise<AuthResponse> {
    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;
    return this.loginService.googleLogin(dto, res, userAgent, ip, clientType);
  }
}
