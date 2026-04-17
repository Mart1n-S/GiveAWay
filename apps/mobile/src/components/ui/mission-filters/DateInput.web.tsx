export interface DateInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  label?: string;
}

/**
 * Date picker natif du navigateur via `<input type="date">`.
 *
 * - Affiche le sélecteur de date intégré au navigateur (Chrome, Firefox, Safari…).
 * - La valeur est toujours au format YYYY-MM-DD attendu par le backend.
 * - Aucune librairie externe nécessaire.
 */
export function DateInput({ value, onChange, label }: DateInputProps) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value || undefined)
      }
      aria-label={label}
      style={{
        flex: 1,
        height: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: 13,
        color: value ? "#111827" : "#9CA3AF",
        fontFamily: "inherit",
        cursor: "pointer",
        minWidth: 0,
        margin: 0,
        padding: 0,
      }}
    />
  );
}
