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
  testID?: string;
  /**
   * Compteur affiché en badge à droite du libellé.
   * Si > 10, affiché "10+". Caché si 0 ou undefined.
   */
  badgeCount?: number;
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
   * Liste secondaire (Milieu du menu, séparé par une ligne).
   * Ex: Mentions légales, Aide...
   */
  secondaryLinks?: MenuLink[];

  /**
   * Liste des liens affichés tout en bas (Pied de page).
   * Ex: Paramètres.
   */
  bottomLinks?: MenuLink[];

  /**
   * Callback déclenché quand on clique sur "Se connecter" (Mode Invité).
   */
  onLoginPress?: () => void;

  /**
   * Callback déclenché quand on clique sur "S'inscrire" (Mode Invité).
   */
  onRegisterPress?: () => void;

  /**
   * Callback déclenché quand on clique sur "Se déconnecter" (Mode Connecté).
   */
  onLogoutPress?: () => void;

  /**
   * Icône spécifique pour le bouton de déconnexion dans le menu
   */
  logoutIcon?: ReactNode;

  className?: string;
}
