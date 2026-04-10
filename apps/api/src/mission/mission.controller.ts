import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { MissionListResponse } from '@repo/shared';
import { MissionService } from './mission.service';

@Controller('missions')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  /**
   * GET /missions
   * Retourne la liste paginée des missions actives.
   * Route publique — pas d'authentification requise.
   *
   * Query params optionnels :
   * - page (défaut: 1)
   * - pageSize (défaut: 12)
   * - type (MISSION | EVENT | COLLECT | INFO)
   * - causeId (ID d'une cause)
   * - city (nom de ville, recherche partielle)
   * - search (recherche textuelle dans titre/description/association)
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
