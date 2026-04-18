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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AssociationMissionItem,
  AssociationMissionDashboard,
  CreateMissionDto,
  CreateMissionSchema,
  UpdateMissionDto,
  UpdateMissionSchema,
} from '@repo/shared';
import { AssociationRole } from '../generated/prisma/client';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AssociationMemberGuard } from './guards/association-member.guard';
import { AssociationRoleGuard } from './guards/association-role.guard';
import { AssociationRoles } from './guards/association-roles.decorator';
import { AssociationMissionsService } from './association-missions.service';

@Controller('associations/:associationId/missions')
@UseGuards(AuthGuard('jwt'), AssociationMemberGuard)
export class AssociationMissionsController {
  constructor(private readonly service: AssociationMissionsService) {}

  /**
   * POST /associations/:associationId/missions
   * Crée une mission directement ACTIVE.
   * Requiert le rôle OWNER, ADMIN ou EDITOR.
   */
  @Post()
  @AssociationRoles(
    AssociationRole.OWNER,
    AssociationRole.ADMIN,
    AssociationRole.EDITOR,
  )
  @UseGuards(AssociationRoleGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Body(new ZodValidationPipe(CreateMissionSchema)) dto: CreateMissionDto,
  ): Promise<AssociationMissionItem> {
    return this.service.create(associationId, dto);
  }

  /**
   * GET /associations/:associationId/missions/dashboard
   * Retourne les missions classées en 4 onglets (active / upcoming / past / archived).
   * IMPORTANT : doit être déclaré AVANT :missionId.
   * Accessible à tous les membres de l'association.
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboard(
    @Param('associationId', ParseIntPipe) associationId: number,
  ): Promise<AssociationMissionDashboard> {
    return this.service.getDashboard(associationId);
  }

  /**
   * GET /associations/:associationId/missions/:missionId
   * Retourne le détail complet d'une mission (gestion).
   * Accessible à tous les membres de l'association.
   */
  @Get(':missionId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<AssociationMissionItem> {
    return this.service.findOne(associationId, missionId);
  }

  /**
   * PATCH /associations/:associationId/missions/:missionId
   * Modifie les détails d'une mission existante.
   * Requiert le rôle OWNER, ADMIN ou EDITOR.
   */
  @Patch(':missionId')
  @AssociationRoles(
    AssociationRole.OWNER,
    AssociationRole.ADMIN,
    AssociationRole.EDITOR,
  )
  @UseGuards(AssociationRoleGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body(new ZodValidationPipe(UpdateMissionSchema)) dto: UpdateMissionDto,
  ): Promise<AssociationMissionItem> {
    return this.service.update(associationId, missionId, dto);
  }

  /**
   * PATCH /associations/:associationId/missions/:missionId/archive
   * Archive une mission (ACTIVE → ARCHIVED).
   * Requiert le rôle OWNER ou ADMIN.
   */
  @Patch(':missionId/archive')
  @AssociationRoles(AssociationRole.OWNER, AssociationRole.ADMIN)
  @UseGuards(AssociationRoleGuard)
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<AssociationMissionItem> {
    return this.service.archive(associationId, missionId);
  }

  /**
   * PATCH /associations/:associationId/missions/:missionId/unarchive
   * Désarchive une mission (ARCHIVED → ACTIVE).
   * Requiert le rôle OWNER ou ADMIN.
   */
  @Patch(':missionId/unarchive')
  @AssociationRoles(AssociationRole.OWNER, AssociationRole.ADMIN)
  @UseGuards(AssociationRoleGuard)
  @HttpCode(HttpStatus.OK)
  async unarchive(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<AssociationMissionItem> {
    return this.service.unarchive(associationId, missionId);
  }

  /**
   * DELETE /associations/:associationId/missions/:missionId
   * Suppression logique (OWNER uniquement, restriction : 0 participants).
   */
  @Delete(':missionId')
  @AssociationRoles(AssociationRole.OWNER)
  @UseGuards(AssociationRoleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('associationId', ParseIntPipe) associationId: number,
    @Param('missionId', ParseIntPipe) missionId: number,
  ): Promise<void> {
    return this.service.delete(associationId, missionId);
  }
}
