import { useState } from "react";
import { Pressable, View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { MatchInfoModal } from "./match-info-modal";

/** Anneau de focus accessible (clavier) — réutilisé sur les contrôles cliquables. */
const focusRing =
  "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-1";

export interface MatchToggleProps {
  /** État actuel du toggle. */
  value: boolean;
  /** Callback au changement d'état. */
  onChange: (next: boolean) => void;
  /** Label personnalisable (défaut : "Pour moi"). */
  label?: string;
  /** Désactive le toggle (ex. pendant un chargement). */
  disabled?: boolean;
  /** Affiche le bouton "?" qui ouvre l'explication du matching. Défaut : true. */
  showInfoButton?: boolean;
  /** Classes additionnelles sur le wrapper. */
  className?: string;
  /** Identifiant de test. */
  testID?: string;
}

/**
 * Bouton pill toggle pour activer la mise en avant des missions matchées
 * sur le profil de l'utilisateur. Agnostique : la lecture/écriture de l'état
 * est déléguée au parent (qui le branche typiquement sur usePreferencesStore).
 *
 * @example
 * <MatchToggle value={highlightMatching} onChange={setHighlightMatching} />
 */
export function MatchToggle({
  value,
  onChange,
  label = "Pour moi",
  disabled = false,
  showInfoButton = true,
  className,
  testID,
}: MatchToggleProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <View
      testID={testID ? `${testID}-wrapper` : "match-toggle-wrapper"}
      className={clsx("flex-row items-center gap-1", className)}
    >
      <Pressable
        testID={testID ?? "match-toggle"}
        onPress={() => onChange(!value)}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        accessibilityLabel={label}
        className={clsx(
          "flex-row items-center gap-2 px-4 py-2 rounded-full border transition-colors",
          focusRing,
          value
            ? [
                "bg-amber-100 border-amber-500",
                !disabled && [
                  "hover:bg-amber-200 hover:border-amber-600",
                  "active:bg-amber-300 active:border-amber-700",
                ],
              ]
            : [
                "bg-white border-grey-200",
                !disabled && [
                  "hover:bg-amber-50 hover:border-amber-400",
                  "active:bg-amber-100 active:border-amber-500",
                ],
              ],
          disabled && "opacity-50",
          !disabled && "web:cursor-pointer",
        )}
      >
        <View
          className={clsx(
            "w-5 h-5 rounded-full items-center justify-center",
            value ? "bg-amber-500" : "bg-grey-100",
          )}
        >
          <Text
            className={clsx(
              "text-xs leading-none",
              value ? "text-white" : "text-grey-400",
            )}
          >
            ★
          </Text>
        </View>
        <Text
          className={clsx(
            "text-sm font-semibold",
            value ? "text-amber-700" : "text-grey-700",
          )}
        >
          {label}
        </Text>
      </Pressable>

      {showInfoButton && (
        <Pressable
          testID="match-info-button"
          onPress={() => setIsInfoOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Comment fonctionne le matching ?"
          className={clsx(
            "w-7 h-7 items-center justify-center rounded-full border border-grey-200 bg-white transition-colors",
            "hover:bg-amber-50 hover:border-amber-400",
            "active:bg-amber-100 active:border-amber-500",
            "web:cursor-pointer",
            focusRing,
          )}
        >
          <Text className="text-grey-600 text-xs font-bold">?</Text>
        </Pressable>
      )}

      <MatchInfoModal
        visible={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </View>
  );
}
