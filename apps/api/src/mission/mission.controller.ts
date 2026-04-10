import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MissionDetail, MissionListResponse, MissionMapItem } from '@repo/shared';
import { MissionService } from './mission.service';

@Controller('missions')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  /**
   * GET /missions/map
   * Retourne les missions géolocalisées pour affichage sur la carte.
   * Route publique — pas d'authentification requise.
   * Doit être déclaré AVANT :id pour éviter que NestJS l'interprète comme un paramètre.
   */
  @Get('map')
  @HttpCode(HttpStatus.OK)
  async findForMap(): Promise<MissionMapItem[]> {
    return this.missionService.findForMap();
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
   * Query params optionnels : page, pageSize, type, causeId, city, search
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('causeId') causeId?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ): Promise<MissionListResponse> {
    return this.missionService.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      type,
      causeId: causeId ? Number(causeId) : undefined,
      city,
      search,
    });
  }
}
