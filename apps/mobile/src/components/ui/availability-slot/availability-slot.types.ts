import { ReactNode } from "react";

export interface AvailabilitySlotProps {
  /** Icône SVG à afficher */
  icon: ReactNode;

  /** Label affiché sous l'icône */
  label: string;

  /** Le créneau est-il actif/sélectionné */
  active?: boolean;

  /** Classes additionnelles */
  className?: string;
}