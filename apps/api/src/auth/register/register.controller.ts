import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import {
  RegisterDto,
  RegisterSchema,
  RegisterAssociationDto,
  RegisterAssociationSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ImageValidationPipe } from '../../common/pipes/image-validation.pipe';
import { DocumentsValidationPipe } from '../../common/pipes/documents-validation.pipe';
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

  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('register/association')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'documents', maxCount: 5 },
    ]),
  )
  async registerAssociation(
    @Body(new ZodValidationPipe(RegisterAssociationSchema))
    dto: RegisterAssociationDto,
    @UploadedFiles()
    rawFiles?: {
      logo?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    const logo = new ImageValidationPipe(false).transform(rawFiles?.logo?.[0]);
    const documents = new DocumentsValidationPipe(false).transform(
      rawFiles?.documents,
    );
    return this.registerService.registerAssociation(dto, logo, documents);
  }
}
