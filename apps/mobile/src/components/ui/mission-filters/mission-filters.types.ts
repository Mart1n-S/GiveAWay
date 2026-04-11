import type { MissionListQuery } from "@repo/shared";

/** Item générique pour les listes déroulantes (causes, compétences, etc.) */
export interface FilterRefItem {
  id: number;
  label: string;
}

export interface MissionFiltersProps {
  /** Valeur courante des filtres */
  value: MissionListQuery;

  /** Callback déclenché à chaque changement de filtre */
  onChange: (value: MissionListQuery) => void;

  /** Réinitialise tous les filtres */
  onReset: () => void;

  /**
   * 'list' (défaut) : barre complète avec champ de recherche.
   * 'map' : version sans champ de recherche.
   */
  variant?: "list" | "map";

  /** Données référentielles — fournies par le parent */
  causes?: FilterRefItem[];
  skills?: FilterRefItem[];
  publicTypes?: FilterRefItem[];
  volunteerTypes?: FilterRefItem[];

  /** Classes additionnelles (NativeWind) */
  className?: string;
}
