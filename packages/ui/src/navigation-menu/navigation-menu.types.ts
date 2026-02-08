import { ReactNode } from "react";
import { ViewProps } from "react-native";

/**
 * Définition d'un lien dans le menu.
 */
export interface MenuLink {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  isDestructive?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

/**
 * Props du composant NavigationMenu.
 */
export interface NavigationMenuProps extends ViewProps {
  /**
   * Informations de l'utilisateur connecté.
   */
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string | null;
    initials?: string | null;
  } | null;

  /**
   * Force l'affichage en mode invité (Boutons de connexion).
   */
  isGuest?: boolean;

  /**
   * Liste principale des liens (Haut du menu).
   */
  mainLinks: MenuLink[];

  /**
   * Liste secondaire (Bas du menu, séparé par une ligne).
   * Ex: Mentions légales, Aide...
   */
  secondaryLinks?: MenuLink[];

  /**
   * Callback déclenché quand on clique sur "Se connecter" (Mode Invité).
   */
  onLoginPress?: () => void;

  /**
   * Callback déclenché quand on clique sur "S'inscrire" (Mode Invité).
   */
  onRegisterPress?: () => void;

  className?: string;
}
