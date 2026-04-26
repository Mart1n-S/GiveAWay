import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  MissionDetail,
  MissionListResponse,
  MissionMapItem,
  MissionListQueryDto,
  MissionListQuerySchema,
} from '@repo/shared';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MissionService } from './mission.service';

interface RequestWithOptionalUser {
  user?: { id: number };
}

@Controller('missions')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  /**
   * GET /missions/map
   * Retourne les missions géolocalisées pour affichage sur la carte.
   * Auth optionnelle : si présente + withMatching=true, enrichit chaque item d'un matchScore.
   * Doit être déclaré AVANT :id pour éviter que NestJS l'interprète comme un paramètre.
   *
   * Accepte les mêmes filtres que GET /missions (sauf page/pageSize).
   */
  @Get('map')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findForMap(
    @Query(new ZodValidationPipe(MissionListQuerySchema))
    query: MissionListQueryDto,
    @Req() req: RequestWithOptionalUser,
  ): Promise<MissionMapItem[]> {
    return this.missionService.findForMap(query, req.user?.id);
  }

  /**
   * GET /missions/:id
   * Retourne le détail complet d'une mission.
   * Route publique — pas d'authentification requise.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MissionDetail> {
    return this.missionService.findById(id);
  }

  /**
   * GET /missions
   * Retourne la liste paginée des missions actives.
   * Auth optionnelle : si présente + withMatching=true, enrichit chaque item d'un matchScore.
   *
   * Query params validés par MissionListQuerySchema :
   *   page (défaut 1), pageSize (défaut 12, max 100),
   *   type (MISSION|EVENT|COLLECT|INFO), causeId, city, search, withMatching
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query(new ZodValidationPipe(MissionListQuerySchema))
    query: MissionListQueryDto,
    @Req() req: RequestWithOptionalUser,
  ): Promise<MissionListResponse> {
    return this.missionService.findAll(query, req.user?.id);
  }
}
