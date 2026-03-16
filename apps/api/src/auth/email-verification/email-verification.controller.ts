import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  VerifyEmailDto,
  VerifyEmailSchema,
  ResendVerificationDto,
  ResendVerificationSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GuestGuard } from '../guards/guest.guard';
import { EmailVerificationService } from './email-verification.service';

@Controller('auth')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Route: POST /auth/verify
  @UseGuards(GuestGuard)
  @Post('verify')
  @HttpCode(200)
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailSchema)) dto: VerifyEmailDto,
  ) {
    return this.emailVerificationService.verifyEmail(dto.code);
  }

  // Route: POST /auth/resend-verification
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requêtes par heure
  @Post('resend-verification')
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.emailVerificationService.resendVerificationEmail(dto);
  }
}
