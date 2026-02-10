import { TextInputProps } from "react-native";
import { ReactNode } from "react";

export interface InputProps extends TextInputProps {
    label?: string;

    /** Texte d'aide permanent (gris) affiché sous l'input */
    helperText?: string;

    /** Message d'erreur (rouge) affiché sous le helperText. 
     * Sa présence active automatiquement la bordure rouge. */
    errorMessage?: string;

    /** Force l'état d'erreur visuel (bordure rouge) même sans message */
    error?: boolean;

    id?: string;

    /** Désactive l'input */
    disabled?: boolean;

    /** Icône à gauche (non cliquable, ex: email) */
    leftIcon?: ReactNode;

    /** Icône à droite (ex: oeil mot de passe) */
    rightIcon?: ReactNode;

    /** Action au clic sur l'icône de droite */
    onRightIconPress?: () => void;

    /** Classes CSS supplémentaires pour le conteneur global */
    containerClassName?: string;
}