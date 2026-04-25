export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si true, le bouton de confirmation est affiché en rouge */
  destructive?: boolean;
  /** "horizontal" (défaut) empile les boutons côte à côte, "vertical" les empile l'un sous l'autre */
  layout?: "horizontal" | "vertical";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}
