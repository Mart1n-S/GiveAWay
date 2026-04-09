import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseFloatPipe,
  Query,
} from '@nestjs/common';
import { AssociationMapItem } from '@repo/shared';
import { AssociationService } from './association.service';

@Controller('associations')
export class AssociationController {
  constructor(private readonly associationService: AssociationService) {}

  /**
   * GET /associations/nearby
   *   ?lat=<float>&lng=<float>
   *   &radius=10          (km, défaut 10, max 50)
   *   &categoryIds=1,2,3  (optionnel, virgule-séparé)
   *   &createdAfter=2024-01-01  (optionnel, ISO date)
   *   &createdBefore=2025-01-01 (optionnel, ISO date)
   *
   * Retourne les associations validées dans un rayon donné autour d'un point.
   * Route publique — aucune authentification requise.
   */
  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  async getNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius') radius?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
  ): Promise<AssociationMapItem[]> {
    const radiusKm = radius ? parseFloat(radius) : 10;

    const parsedCategoryIds = categoryIds
      ? categoryIds.split(',').map(Number).filter(Boolean)
      : undefined;

    const parsedCreatedAfter = createdAfter ? new Date(createdAfter) : undefined;
    const parsedCreatedBefore = createdBefore
      ? new Date(createdBefore)
      : undefined;

    return this.associationService.findNearby(lat, lng, radiusKm, {
      categoryIds: parsedCategoryIds,
      createdAfter: parsedCreatedAfter,
      createdBefore: parsedCreatedBefore,
    });
  }
}
