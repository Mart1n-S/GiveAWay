import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input/input";
import { InputProps } from "@/components/ui/input/input.types";

/**
 * Props du FormInput :
 * 1. T extends FieldValues : Permet le typage dynamique selon le schéma Zod
 * 2. Omit : On retire les props que React Hook Form gère (value, onChange, error...)
 * pour éviter les conflits avec le composant UI de base.
 */
interface FormInputProps<T extends FieldValues> extends Omit<
  InputProps,
  "value" | "onChangeText" | "onBlur" | "errorMessage" | "error"
> {
  control: Control<T>;
  name: Path<T>;
}

export const FormInput = <T extends FieldValues>({
  control,
  name,
  ...inputProps // Récupération des props visuelles (label, placeholder, icons...)
}: FormInputProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <Input
          {...inputProps} // Transmission du style et des props UI
          // --- Connexion Logique (React Hook Form) ---

          // 1. La Valeur
          value={value === undefined || value === null ? "" : String(value)}
          // 2. Les événements
          // React Hook Form renvoie "onChange", mais l'Input attend "onChangeText"
          onChangeText={onChange}
          onBlur={onBlur}
          // --- Connexion des Erreurs (Zod -> UI) ---

          // 3. Le message d'erreur (ex: "Email invalide")
          errorMessage={error?.message}
          // 4. L'état d'erreur (pour l'affichage de la bordure rouge)
          error={!!error}
        />
      )}
    />
  );
};
