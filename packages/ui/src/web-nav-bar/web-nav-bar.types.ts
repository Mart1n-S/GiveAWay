import { ReactNode } from "react";
import { ViewProps } from "react-native";
import { MenuLink } from "../navigation-menu/navigation-menu.types";

export interface WebNavBarProps extends ViewProps {
  /**
   * Infos utilisateur. Si null, affiche "Se connecter / S'inscrire".
   */
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string | null;
    initials?: string | null;
  } | null;

  /** Liens affichés au centre (Desktop) et dans le menu (Mobile) */
  mainLinks: MenuLink[];

  /** Liens affichés uniquement dans le menu mobile */
  secondaryLinks?: MenuLink[];
  /** Liens affichés tout en bas du menu mobile (ex: Paramètres) */
  bottomLinks?: MenuLink[];

  /** Callback bouton Connexion */
  onLoginPress?: () => void;

  /** Callback bouton Inscription */
  onRegisterPress?: () => void;

  /** Callback bouton Profil (clic sur l'avatar) */
  onProfilePress?: () => void;
  /** Callback bouton Déconnexion (dans le menu) */
  onLogoutPress?: () => void;

  /** Le composant Logo (déjà configuré avec l'icône) */
  logoComponent: ReactNode;

  /** Icône du menu Burger (pour mobile) */
  menuIcon: ReactNode;

  /** Icône de fermeture du menu (croix) */
  closeIcon: ReactNode;

  /** Icône de déconnexion*/
  logoutIcon?: ReactNode;
}
