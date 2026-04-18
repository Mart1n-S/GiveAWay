import { View } from "react-native";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Text } from "@/components/ui/text/text";
import { DateInput } from "@/components/ui/mission-filters/DateInput";

interface FormDateInputProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly name: Path<T>;
  readonly label: string;
}

/**
 * Wrapper React Hook Form autour du `DateInput` polymorphe (web = input type=date, mobile = masque).
 *
 * Le schéma Zod attend une date ISO 8601 (`.datetime()`), mais le `DateInput` émet
 * une string `YYYY-MM-DD` — on convertit ici en appendant `T00:00:00.000Z` pour le form,
 * et on retire la partie heure à l'affichage.
 */
export function FormDateInput<T extends FieldValues>({
  control,
  name,
  label,
}: FormDateInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        const displayValue =
          typeof value === "string" && value.length >= 10
            ? value.slice(0, 10)
            : undefined;

        return (
          <View className="gap-1">
            <Text className="text-sm font-semibold text-grey-800">{label}</Text>
            <View
              className={`h-11 px-3 border rounded-lg justify-center bg-white ${
                error ? "border-red-400" : "border-grey-200"
              }`}
            >
              <DateInput
                value={displayValue}
                onChange={(v) =>
                  onChange(v ? `${v}T00:00:00.000Z` : null)
                }
                label={label}
              />
            </View>
            {!!error?.message && (
              <Text className="text-xs text-error-100">{error.message}</Text>
            )}
          </View>
        );
      }}
    />
  );
}
