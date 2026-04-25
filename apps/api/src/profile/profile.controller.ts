import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
  UpdateNotificationsDto,
  UpdateNotificationsSchema,
  RegisterPushTokenDto,
  RegisterPushTokenSchema,
  User,
  FollowedAssociationItem,
  ParticipationStatsDto,
  ParticipationStatsQueryDto,
  ParticipationStatsQuerySchema,
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
   * GET /profile/follows
   * Retourne la liste des associations suivies par l'utilisateur connecté
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('follows')
  @HttpCode(HttpStatus.OK)
  async getFollowedAssociations(
    @Req() req: AuthenticatedRequest,
  ): Promise<FollowedAssociationItem[]> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }
    return this.profileService.getFollowedAssociations(req.user.id);
  }

  /**
   * GET /profile/participations/stats
   * Retourne les statistiques de participation du bénévole connecté
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('participations/stats')
  @HttpCode(HttpStatus.OK)
  async getParticipationStats(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(ParticipationStatsQuerySchema))
    query: ParticipationStatsQueryDto,
  ): Promise<ParticipationStatsDto> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }
    return this.profileService.getParticipationStats(req.user.id, query);
  }

  /**
   * GET /profile/missions/:missionId/participation
   * Vérifie si l'utilisateur connecté participe à une mission donnée
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('missions/:missionId/participation')
  @HttpCode(HttpStatus.OK)
  async checkParticipation(
    @Req() req: AuthenticatedRequest,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<{ isParticipating: boolean }> {
    if (!req.user.id)
      throw new UnauthorizedException('Utilisateur non identifié');
    const isParticipating = await this.profileService.checkParticipation(
      req.user.id,
      missionId,
    );
    return { isParticipating };
  }

  /**
   * POST /profile/missions/:missionId/participate
   * L'utilisateur connecté s'inscrit à une mission
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('missions/:missionId/participate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async participateInMission(
    @Req() req: AuthenticatedRequest,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<void> {
    if (!req.user.id)
      throw new UnauthorizedException('Utilisateur non identifié');
    await this.profileService.participateInMission(req.user.id, missionId);
  }

  /**
   * DELETE /profile/missions/:missionId/participate
   * L'utilisateur connecté annule sa participation à une mission
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete('missions/:missionId/participate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelParticipation(
    @Req() req: AuthenticatedRequest,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<void> {
    if (!req.user.id)
      throw new UnauthorizedException('Utilisateur non identifié');
    await this.profileService.cancelParticipation(req.user.id, missionId);
  }

  /**
   * GET /profile/export
   * Exporte toutes les données personnelles de l'utilisateur au format CSV (RGPD)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('export')
  async exportData(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    const buffer = await this.profileService.exportData(req.user.id);
    const filename = `giveaway-mes-donnees-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
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
   * PATCH /profile/notifications
   * Met à jour les préférences de notifications de l'utilisateur connecté
   */
  @UseGuards(AuthGuard('jwt'))
  @Patch('notifications')
  @HttpCode(HttpStatus.OK)
  async updateNotifications(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateNotificationsSchema))
    dto: UpdateNotificationsDto,
  ): Promise<User> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    return this.profileService.updateNotifications(req.user.id, dto);
  }

  /**
   * PATCH /profile/push-token
   * Enregistre ou met à jour le token de notification push de l'appareil
   */
  @UseGuards(AuthGuard('jwt'))
  @Patch('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async savePushToken(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(RegisterPushTokenSchema))
    dto: RegisterPushTokenDto,
  ): Promise<void> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }
    await this.profileService.savePushToken(req.user.id, dto);
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
