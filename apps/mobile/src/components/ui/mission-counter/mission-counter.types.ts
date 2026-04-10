export interface MissionCounterProps {
  /** Nombre total de missions */
  total: number;

  /** Indique si les données sont en cours de chargement */
  isLoading?: boolean;

  /** Classes additionnelles */
  className?: string;
}
