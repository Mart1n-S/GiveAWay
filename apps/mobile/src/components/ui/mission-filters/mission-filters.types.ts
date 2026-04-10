import { ActivityType } from "@repo/shared";

export interface MissionFiltersProps {
  /** Type d'activité sélectionné (ou null pour "Tous") */
  selectedType: ActivityType | null;

  /** Callback quand le type change */
  onTypeChange: (type: ActivityType | null) => void;

  /** Texte de recherche */
  searchText: string;

  /** Callback quand le texte de recherche change */
  onSearchChange: (text: string) => void;

  /** Classes additionnelles */
  className?: string;
}
