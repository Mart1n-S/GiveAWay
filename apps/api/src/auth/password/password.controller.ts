import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import {
  ForgotPasswordDto,
  ForgotPasswordSchema,
  ResetPasswordDto,
  ResetPasswordSchema,
  ChangePasswordDto,
  ChangePasswordSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GuestGuard } from '../guards/guest.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CookieService } from '../shared/cookie.service';
import { PasswordService } from './password.service';

@Controller('auth')
export class PasswordController {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly cookieService: CookieService,
  ) {}

  // Route: POST /auth/forgot-password
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 demandes par heure max
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto);
  }

  // Route: POST /auth/reset-password
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 tentatives / 15 min
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }

  // Route: POST /auth/change-password
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 tentatives / 15 min
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // On extrait l'ID de l'utilisateur depuis le token décodé (req.user)
    const userId = req.user.id;

    // 1. On fait le changement en BDD (qui supprime les refresh tokens)
    const result = await this.passwordService.changePassword(userId, dto);

    // 2. On nettoie les cookies du navigateur pour le déconnecter tout de suite
    this.cookieService.clearAuthCookies(res);
    return result;
  }
}
