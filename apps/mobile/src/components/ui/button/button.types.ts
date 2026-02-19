import { PressableProps as NativePressableProps } from "react-native";

export type ButtonVariant = "primary" | "secondary" | "tertiary";

export interface ButtonProps extends NativePressableProps {
  /** Le contenu du bouton (Texte) */
  children?: React.ReactNode;

  /** Variante visuelle du bouton */
  variant?: ButtonVariant;

  /** Affiche l’état loading (spinner + désactivé) */
  loading?: boolean;

  /** Classes additionnelles (pour surcharger le style si besoin) */
  className?: string;

  /** Icône optionnelle à gauche du texte */
  icon?: React.ReactNode;
}
