import { PressableProps } from "react-native";
import { ReactNode } from "react";

export interface AvatarButtonProps extends PressableProps {
  /** URL de l'image de profil */
  imageUrl?: string | null;

  /** Initiales à afficher si pas d'image */
  initials?: string | null;

  /** Force l'affichage en mode "Invité" (icône générique) */
  isGuest?: boolean;

  /** L'icône à afficher en mode Guest (ex: <UserIcon />) */
  guestIcon?: ReactNode;

  /** Taille du cercle */
  size?: "sm" | "md" | "lg";

  /** Classes additionnelles pour le positionnement */
  className?: string;

  /** Rendre le bouton non interactif */
  readonly?: boolean;
}
