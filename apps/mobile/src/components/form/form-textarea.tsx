import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { TextArea } from "@/components/ui/textarea/textarea";
import { TextAreaProps } from "@/components/ui/textarea/textarea.types";

/**
 * Props du FormTextarea :
 * On retire les props gérées par RHF (value, onChangeText, onBlur, errorMessage, error)
 * pour éviter les conflits et forcer l'usage via le control.
 */
interface FormTextareaProps<T extends FieldValues> extends Omit<
  TextAreaProps,
  "value" | "onChangeText" | "onBlur" | "errorMessage" | "error"
> {
  control: Control<T>;
  name: Path<T>;
}

export const FormTextarea = <T extends FieldValues>({
  control,
  name,
  ...textareaProps
}: FormTextareaProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <TextArea
          {...textareaProps}
          // --- Connexion Logique (React Hook Form) ---

          // 1. La Valeur (Conversion Safe comme pour FormInput)
          // Si undefined/null -> chaîne vide ""
          value={value === undefined || value === null ? "" : String(value)}
          // 2. Les événements
          // TextArea utilise "onChangeText" tout comme TextInput
          onChangeText={onChange}
          onBlur={onBlur}
          // --- Connexion des Erreurs (Zod -> UI) ---
          errorMessage={error?.message}
          error={!!error}
        />
      )}
    />
  );
};
