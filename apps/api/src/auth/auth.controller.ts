import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UsePipes,
  Res,
  Req,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { GuestGuard } from './guards/guest.guard';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import {
  RegisterDto,
  RegisterSchema,
  LoginDto,
  LoginSchema,
  ResendVerificationDto,
  ResendVerificationSchema,
  ForgotPasswordDto,
  ForgotPasswordSchema,
  ResetPasswordDto,
  ResetPasswordSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Route: POST /auth/register
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 5 * 60 * 1000 } })
  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Route: GET /auth/verify
  @UseGuards(GuestGuard)
  @Get('verify')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // Route: POST /auth/login
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requêtes par heure
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ) {
    // Cela gère les cas où user-agent est undefined ou un tableau, sans erreur ESLint.
    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;

    const { accessToken, refreshToken } = await this.authService.login(
      dto,
      userAgent,
      ip,
    );

    const isProd = process.env.NODE_ENV === 'production';

    // 1. On met TOUJOURS les cookies (pour le Web et comme backup)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 2. LOGIQUE CONDITIONNELLE
    // Si le header dit "mobile", on renvoie les tokens dans le JSON.
    // Sinon (Web), on ne renvoie que le message de succès.
    if (clientType === 'mobile') {
      return {
        message: 'Connexion réussie',
        backendTokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60 * 1000,
        },
      };
    }

    return { message: 'Connexion réussie' };
  }

  // Route: POST /auth/forgot-password
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 demandes par heure max
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Route: POST /auth/reset-password
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 tentatives / 15 min
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // Route: POST /auth/resend-verification
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requêtes par heure
  @Post('resend-verification')
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  // Route: POST /auth/logout
  @Throttle({ default: { limit: 5, ttl: 5 * 60 * 1000 } })
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
      await this.authService.logout(userId, refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Déconnecté avec succès' };
  }

  // Route: POST /auth/refresh
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;

    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;

    const tokens = await this.authService.refreshTokens(
      userId,
      refreshToken,
      userAgent,
      ip,
    );

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Logique conditionnelle ici aussi
    if (clientType === 'mobile') {
      return {
        message: 'Session rafraîchie',
        backendTokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 15 * 60 * 1000,
        },
      };
    }

    return { message: 'Session rafraîchie' };
  }

  // Route: GET /auth/me
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
