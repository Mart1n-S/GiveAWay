import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Skill, Cause } from '@repo/shared';
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
}
