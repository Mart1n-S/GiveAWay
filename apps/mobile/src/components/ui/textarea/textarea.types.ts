import { TextInputProps } from "react-native";

export interface TextAreaProps extends TextInputProps {
    label?: string;
    helperText?: string;
    errorMessage?: string;
    error?: boolean;
    disabled?: boolean;

    /** Affiche un compteur de caractères (ex: 0/200) si maxLength est défini */
    showCharacterCount?: boolean;

    containerClassName?: string;
}