import { api } from "../lib/axios";
import { Skill, Cause } from "@repo/shared";

export const ReferenceService = {
  /**
   * GET /reference/skills
   * Retourne la liste de toutes les compétences disponibles.
   * Utilisé pour alimenter les listes de sélection (profil, filtres missions).
   */
  getSkills: async (): Promise<Skill[]> => {
    const response = await api.get<Skill[]>("/reference/skills");
    return response.data;
  },

  /**
   * GET /reference/causes
   * Retourne la liste de toutes les causes disponibles.
   * Utilisé pour alimenter les listes de sélection (profil, filtres missions).
   */
  getCauses: async (): Promise<Cause[]> => {
    const response = await api.get<Cause[]>("/reference/causes");
    return response.data;
  },
};
