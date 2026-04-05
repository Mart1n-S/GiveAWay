export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Message d'erreur affiché sous le toggle en cas d'échec de la sauvegarde */
  errorMessage?: string;
  testID?: string;
}
