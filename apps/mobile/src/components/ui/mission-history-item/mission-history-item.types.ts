export interface MissionHistoryItemProps {
  /** Titre de la mission */
  title: string;

  /** Nom de l'association */
  associationName: string;

  /** Date de participation */
  date: Date | string;

  /** Type de mission — détermine la couleur et l'icône */
  type: "MISSION" | "EVENT" | "COLLECT" | "INFO";

  /** Callback au clic sur l'item */
  onPress?: () => void;

  /** Classes additionnelles */
  className?: string;
}
