export interface SelectableItem {
  id: number;
  label: string;
}

export interface MultiSelectListProps {
  /** Liste des items disponibles */
  items: SelectableItem[];

  /** IDs des items sélectionnés */
  selectedIds: number[];

  /** Callback au changement de sélection */
  onChange: (selectedIds: number[]) => void;

  /** Variante de couleur */
  variant?: "orange" | "blue";

  /** Classes additionnelles */
  className?: string;
}
