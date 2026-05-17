import { Pressable } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";

interface InfoButtonProps {
  readonly onPress: () => void;
  readonly variant?: "header" | "inline";
}

/**
 * Bouton "?" qui ouvre une modale explicative.
 * - `header` : rendu dans le header natif (mobile) — pas de margin
 * - `inline` : rendu dans une barre en haut de page (web) — margin gauche
 *
 * Reprend le pattern du `?` de match-toggle.tsx pour cohérence visuelle.
 */
export function InfoButton({ onPress, variant = "inline" }: InfoButtonProps) {
  return (
    <Pressable
      testID="messages-info-button"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Pourquoi une conversation peut disparaître ?"
      className={clsx(
        "w-7 h-7 items-center justify-center rounded-full border border-grey-200 bg-white",
        "hover:bg-amber-50 hover:border-amber-400",
        "active:bg-amber-100 active:border-amber-500",
        "web:cursor-pointer",
        variant === "inline" ? "ml-2" : "mr-2",
      )}
    >
      <Text className="text-grey-600 text-xs font-bold">?</Text>
    </Pressable>
  );
}
