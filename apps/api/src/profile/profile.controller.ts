import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  DeleteAccountDto,
  DeleteAccountSchema,
  UpdateProfileDto,
  UpdateProfileSchema,
  User,
} from '@repo/shared';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ImageValidationPipe } from '../common/pipes/image-validation.pipe';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /profile
   * Retourne le profil complet de l'utilisateur connecté
   */
  @UseGuards(AuthGuard('jwt'))
  @Get()
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: AuthenticatedRequest): Promise<User> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    return this.profileService.getProfile(req.user.id);
  }

  /**
   * PATCH /profile
   * Met à jour le profil de l'utilisateur connecté
   */
  @UseGuards(AuthGuard('jwt'))
  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
    @UploadedFile(new ImageValidationPipe(false)) file?: Express.Multer.File,
  ): Promise<User> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    return this.profileService.updateProfile(req.user.id, dto, file);
  }

  /**
   * DELETE /profile
   * Supprime définitivement le compte de l'utilisateur connecté
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(DeleteAccountSchema)) dto: DeleteAccountDto,
  ): Promise<void> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    return this.profileService.deleteProfile(req.user.id, dto, res);
  }
}
