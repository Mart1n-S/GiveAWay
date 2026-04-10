import { MissionListItem } from "@repo/shared";

export interface MissionGridProps {
  /** Liste des missions à afficher */
  missions: MissionListItem[];

  /** Indique si les données sont en cours de chargement */
  isLoading?: boolean;

  /** Callback au clic sur une mission */
  onMissionPress?: (missionId: number) => void;

  /** Classes additionnelles */
  className?: string;
}
