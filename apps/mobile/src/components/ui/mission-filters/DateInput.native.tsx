import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import { colors } from "../theme/tokens";

export interface DateInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  label?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Auto-insère les tirets au fur et à mesure de la saisie. */
function applyMask(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length > 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}

/** Vérifie qu'une string YYYY-MM-DD représente une date calendaire réelle. */
function isValidCalendarDate(s: string): boolean {
  if (!DATE_REGEX.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/**
 * Champ de saisie de date avec masque automatique (AAAA-MM-JJ).
 *
 * - Auto-insère les tirets après l'année et le mois.
 * - Ne déclenche `onChange` que lorsque la date est complète ET calendairement valide.
 * - Déclenche `onChange(undefined)` si le champ est vidé.
 * - Aucune dépendance externe — pas de package à installer.
 */
export function DateInput({
  value,
  onChange,
  placeholder = "AAAA-MM-JJ",
  label,
}: DateInputProps) {
  const [raw, setRaw] = useState(value ?? "");

  // Synchronise la valeur locale lors d'une réinitialisation externe (ex: onReset).
  useEffect(() => {
    setRaw(value ?? "");
  }, [value]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const formatted = applyMask(digits);
    setRaw(formatted);

    if (formatted.length === 10 && isValidCalendarDate(formatted)) {
      // Date complète et valide → on peut requêter le backend.
      onChange(formatted);
    } else if (formatted.length === 0) {
      // Champ vidé → retirer le filtre.
      onChange(undefined);
    }
    // Date incomplète ou invalide → on ne tire pas onChange.
    // Le backend ne reçoit aucune requête pendant la frappe.
  };

  return (
    <TextInput
      value={raw}
      onChangeText={handleChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.grey[400]}
      keyboardType="numeric"
      maxLength={10}
      accessibilityLabel={label}
      style={{
        flex: 1,
        fontSize: 13,
        color: colors.grey[900],
        padding: 0,
        backgroundColor: "transparent",
      }}
    />
  );
}
