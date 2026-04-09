import { Injectable } from '@nestjs/common';
import { AssociationCategory, Cause, Skill } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne la liste complète des compétences disponibles.
   * Utilisé pour alimenter les listes de sélection (profil, filtres missions).
   *
   * @returns Liste des compétences triées alphabétiquement
   */
  async getSkills(): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      orderBy: { label: 'asc' },
      select: { id: true, label: true },
    });
  }

  /**
   * Retourne la liste complète des causes disponibles.
   * Utilisé pour alimenter les listes de sélection (profil, filtres missions).
   *
   * @returns Liste des causes triées alphabétiquement
   */
  async getCauses(): Promise<Cause[]> {
    return this.prisma.cause.findMany({
      orderBy: { label: 'asc' },
      select: { id: true, label: true },
    });
  }

  /**
   * Retourne la liste des catégories d'associations.
   * Route publique — utilisée pour les filtres de la carte.
   */
  async getAssociationCategories(): Promise<AssociationCategory[]> {
    return this.prisma.associationCategory.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }
}
