import { ViewProps } from "react-native";
import { ReactNode } from "react";

export type LogoSize = "sm" | "md" | "lg" | "xl";

export interface LogoProps extends ViewProps {
  /**
   * Taille du logo (Icône + Texte).
   * @default "md"
   */
  size?: LogoSize;

  /**
   * Affiche ou masque le texte "GiveAWay".
   * Utile pour le mobile responsive où on ne veut parfois que l'icône.
   * @default true
   */
  showText?: boolean;

  /**
   * Le composant SVG de l'icône.
   * On le passe depuis l'app pour éviter les dépendances circulaires.
   * Ex: <GiveawayIcon />
   */
  icon: ReactNode;

  /**
   * Classes CSS additionnelles.
   */
  className?: string;

  /**
   * Couleur du texte (si on est sur un fond sombre par exemple).
   * @default "text-grey-900"
   */
  textColor?: string;
}
