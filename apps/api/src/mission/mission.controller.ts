import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  MissionDetail,
  MissionListResponse,
  MissionMapItem,
  MissionListQueryDto,
  MissionListQuerySchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MissionService } from './mission.service';

@Controller('missions')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  /**
   * GET /missions/map
   * Retourne les missions géolocalisées pour affichage sur la carte.
   * Route publique — pas d'authentification requise.
   * Doit être déclaré AVANT :id pour éviter que NestJS l'interprète comme un paramètre.
   *
   * Accepte les mêmes filtres que GET /missions (sauf page/pageSize).
   */
  @Get('map')
  @HttpCode(HttpStatus.OK)
  async findForMap(
    @Query(new ZodValidationPipe(MissionListQuerySchema))
    query: MissionListQueryDto,
  ): Promise<MissionMapItem[]> {
    return this.missionService.findForMap(query);
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
   * Route publique — pas d'authentification requise.
   *
   * Query params validés par MissionListQuerySchema :
   *   page (défaut 1), pageSize (défaut 12, max 100),
   *   type (MISSION|EVENT|COLLECT|INFO), causeId, city, search
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query(new ZodValidationPipe(MissionListQuerySchema))
    query: MissionListQueryDto,
  ): Promise<MissionListResponse> {
    return this.missionService.findAll(query);
  }
}
