import { TextInputProps } from "react-native";

export interface TextAreaProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;

  /** Affiche un compteur de caractères (ex: 0/200) si maxLength est défini */
  showCharacterCount?: boolean;

  /**
   * Hauteur minimale (px) du TextArea. Défaut 120. Réduire pour usage
   * "compact" type composer de chat (ex: 40).
   */
  minHeight?: number;

  containerClassName?: string;
}
