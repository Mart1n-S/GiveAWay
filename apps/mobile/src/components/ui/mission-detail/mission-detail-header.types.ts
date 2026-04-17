import { ActivityType } from "@repo/shared";

export interface MissionDetailHeaderProps {
  /** Titre de la mission */
  title: string;

  /** Type — détermine la couleur et le label du badge */
  type: ActivityType;

  /** Callback bouton retour (web uniquement — mobile utilise le header natif Stack) */
  onBack: () => void;
}
