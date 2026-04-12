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
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AssociationDto,
  AssociationMemberDto,
  AddMemberDto,
  AddMemberSchema,
  UpdateAssociationDto,
  UpdateAssociationSchema,
  UpdateMemberRoleDto,
  UpdateMemberRoleSchema,
  TransferOwnerDto,
  TransferOwnerSchema,
  AssociationMapItem,
  NearbyQueryDto,
  NearbyQuerySchema,
} from '@repo/shared';
import { AssociationRole } from '../generated/prisma/client';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AssociationService } from './association.service';
import {
  AssociationMemberGuard,
  AssociationAuthenticatedRequest,
} from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';
import { AssociationRoles } from './guards/association-roles.decorator';

@Controller('associations')
export class AssociationController {
  constructor(private readonly associationService: AssociationService) {}

  /**
   * GET /associations/nearby
   *   ?lat=<float>&lng=<float>
   *   &radius=10          (km, défaut 10, max 50)
   *   &limit=200          (max 200)
   *   &categoryIds=1,2,3  (optionnel, virgule-séparé)
   *   &createdAfter=2024-01-01  (optionnel, ISO date)
   *   &createdBefore=2025-01-01 (optionnel, ISO date)
   *
   * Retourne les associations validées dans un rayon donné autour d'un point.
   * Route publique — aucune authentification requise.
   *
   * IMPORTANT : doit être déclaré AVANT :associationId
   * pour éviter que NestJS n'interprète "nearby" comme un paramètre.
   */
  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  async getNearby(
    @Query(new ZodValidationPipe(NearbyQuerySchema)) query: NearbyQueryDto,
  ): Promise<AssociationMapItem[]> {
    return this.associationService.findNearby(query);
  }

  /**
   * GET /associations/:associationId
   * Retourne le profil complet de l'association (membres inclus).
   * Requiert d'être membre de l'association.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard)
  @Get(':associationId')
  @HttpCode(HttpStatus.OK)
  async getAssociation(
    @Param('associationId', ParseIntPipe) associationId: number,
  ): Promise<AssociationDto> {
    return this.associationService.getAssociation(associationId);
  }

  /**
   * PATCH /associations/:associationId
   * Met à jour les informations de l'association.
   * Requiert le rôle OWNER.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard, AssociationRoleGuard)
  @AssociationRoles(AssociationRole.OWNER)
  @Patch(':associationId')
  @HttpCode(HttpStatus.OK)
  async updateAssociation(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Body(new ZodValidationPipe(UpdateAssociationSchema))
    dto: UpdateAssociationDto,
  ): Promise<AssociationDto> {
    return this.associationService.updateAssociation(associationId, dto);
  }

  /**
   * GET /associations/:associationId/members
   * Retourne la liste des membres.
   * Requiert d'être membre de l'association.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard)
  @Get(':associationId/members')
  @HttpCode(HttpStatus.OK)
  async getMembers(
    @Param('associationId', ParseIntPipe) associationId: number,
  ): Promise<AssociationMemberDto[]> {
    return this.associationService.getMembers(associationId);
  }

  /**
   * GET /associations/:associationId/missions
   * Retourne la liste des missions créées par cette association.
   * Requiert d'être membre de l'association.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard)
  @Get('/missions/:associationId')
  @HttpCode(HttpStatus.OK)
  async getAssociationMissions(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limit = pageSize ? parseInt(pageSize, 10) : 3;

    return this.associationService.getAssociationMissions(
      associationId,
      pageNum,
      limit,
    );
  }

  /**
   * POST /associations/:associationId/members
   * Ajoute un membre par son email avec le rôle EDITOR.
   * Requiert le rôle OWNER ou ADMIN.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard, AssociationRoleGuard)
  @AssociationRoles(AssociationRole.OWNER, AssociationRole.ADMIN)
  @Post(':associationId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Body(new ZodValidationPipe(AddMemberSchema)) dto: AddMemberDto,
  ): Promise<AssociationMemberDto> {
    return this.associationService.addMember(associationId, dto);
  }

  /**
   * PATCH /associations/:associationId/members/:memberId
   * Met à jour le rôle d'un membre (ADMIN ou EDITOR uniquement).
   * Requiert le rôle OWNER.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard, AssociationRoleGuard)
  @AssociationRoles(AssociationRole.OWNER)
  @Patch(':associationId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema))
    dto: UpdateMemberRoleDto,
  ): Promise<AssociationMemberDto> {
    return this.associationService.updateMemberRole(
      associationId,
      memberId,
      dto,
    );
  }

  /**
   * DELETE /associations/:associationId/members/:memberId
   * Retire un membre de l'association.
   * Requiert le rôle OWNER ou ADMIN.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard, AssociationRoleGuard)
  @AssociationRoles(AssociationRole.OWNER, AssociationRole.ADMIN)
  @Delete(':associationId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req: AssociationAuthenticatedRequest,
  ): Promise<void> {
    return this.associationService.removeMember(
      associationId,
      memberId,
      req.user.id,
    );
  }

  /**
   * POST /associations/:associationId/transfer-owner
   * Transfère la propriété de l'association à un autre membre.
   * Requiert le rôle OWNER. Force le logout de l'OWNER actuel.
   */
  @UseGuards(AuthGuard('jwt'), AssociationMemberGuard, AssociationRoleGuard)
  @AssociationRoles(AssociationRole.OWNER)
  @Post(':associationId/transfer-owner')
  @HttpCode(HttpStatus.OK)
  async transferOwner(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Req() req: AssociationAuthenticatedRequest,
    @Body(new ZodValidationPipe(TransferOwnerSchema)) dto: TransferOwnerDto,
  ): Promise<void> {
    return this.associationService.transferOwner(
      associationId,
      dto,
      req.user.id,
    );
  }
}
