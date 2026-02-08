import { PressableProps } from "react-native";
import { ReactNode } from "react";

export interface MenuItemProps extends PressableProps {
  /** Le texte principal du lien */
  label: string;

  /** Icône à gauche (optionnel) */
  icon?: ReactNode;

  /** Icône à droite (par défaut une flèche chevron, peut être null pour rien) */
  rightIcon?: ReactNode;

  /** Indique si c'est l'élément actif (page en cours) */
  isActive?: boolean;

  /** Si true, affiche le texte en rouge (ex: Déconnexion) */
  isDestructive?: boolean;

  className?: string;
}
