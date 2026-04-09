import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AssociationCategory, Cause, Skill } from '@repo/shared';
import { ReferenceService } from './reference.service';

@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  /**
   * GET /reference/skills
   * Retourne la liste de toutes les compétences disponibles.
   * Route publique — utilisée pour les filtres et l'édition de profil.
   */
  @Get('skills')
  @HttpCode(HttpStatus.OK)
  async getSkills(): Promise<Skill[]> {
    return this.referenceService.getSkills();
  }

  /**
   * GET /reference/causes
   * Retourne la liste de toutes les causes disponibles.
   * Route publique — utilisée pour les filtres et l'édition de profil.
   */
  @Get('causes')
  @HttpCode(HttpStatus.OK)
  async getCauses(): Promise<Cause[]> {
    return this.referenceService.getCauses();
  }

  /**
   * GET /reference/association-categories
   * Retourne la liste des catégories d'associations.
   * Route publique — utilisée pour les filtres de la carte.
   */
  @Get('association-categories')
  @HttpCode(HttpStatus.OK)
  async getAssociationCategories(): Promise<AssociationCategory[]> {
    return this.referenceService.getAssociationCategories();
  }
}
