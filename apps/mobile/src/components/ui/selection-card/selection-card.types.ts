import { ReactNode } from "react";

export interface SelectionCardProps {
  /** Titre principal de la carte (ex: "Je suis un particulier") */
  title: string;

  /** Description courte sous le titre */
  description: string;

  /** Icône illustrant le rôle (SVG ou composant React) */
  icon: ReactNode;

  /** Liste des avantages/points clés (les puces) */
  features: string[];

  /** Texte du lien d'action (ex: "Créer mon compte") */
  actionLabel: string;

  /** Fonction appelée au clic sur la carte */
  onPress: () => void;

  /** (Optionnel) Badge en haut à droite (ex: "Espace Pro") */
  badgeText?: string;

  /** (Optionnel) Classes CSS supplémentaires pour surcharger le style */
  className?: string;

  /** (Optionnel) ID pour les tests automatisés */
  testID?: string;
}
