import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { RegisterDto, RegisterSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ImageValidationPipe } from '../../common/pipes/image-validation.pipe';
import { GuestGuard } from '../guards/guest.guard';
import { RegisterService } from './register.service';

@Controller('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('register')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
    @UploadedFile(new ImageValidationPipe(false)) file?: Express.Multer.File,
  ) {
    return this.registerService.register(dto, file);
  }
}
