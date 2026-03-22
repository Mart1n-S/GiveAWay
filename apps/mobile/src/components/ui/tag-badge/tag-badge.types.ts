export interface TagBadgeProps {
  label: string;

  /** Variante de couleur du badge */
  variant?: "orange" | "green" | "blue" | "red" | "surface";

  /** Taille du badge */
  size?: "sm" | "md" | "lg";

  /** Classes additionnelles */
  className?: string;
}
