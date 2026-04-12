import { Platform, View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { MissionCard } from "../mission-card/mission-card";
import { MissionGridProps } from "./mission-grid.types";

// Sur native : 2 colonnes fixes (48% + gap-3 = 12px → tient dans tous les écrans ≥ 300px).
// Sur web : responsive via classes Tailwind (1 → 2 → 3 colonnes).
const ITEM_CLASS =
  Platform.OS === "web"
    ? "w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
    : "w-[48%]";
const CONTAINER_GAP = Platform.OS === "web" ? "gap-4" : "gap-3";

/**
 * Grille responsive de MissionCards.
 * - Desktop (≥1024px) : 3 colonnes
 * - Tablette (≥768px) : 2 colonnes
 * - Mobile : 1 colonne
 *
 * Gère les états loading (skeleton) et empty.
 */
export function MissionGrid({
  missions,
  isLoading,
  onMissionPress,
  className,
}: MissionGridProps) {
  // --- État Loading (skeleton) ---
  if (isLoading) {
    return (
      <View
        className={clsx(
          "flex-row flex-wrap",
          CONTAINER_GAP,
          className,
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            className={clsx(
              "bg-grey-100 rounded-2xl h-64 animate-pulse",
              ITEM_CLASS,
            )}
          />
        ))}
      </View>
    );
  }

  // --- État Empty ---
  if (missions.length === 0) {
    return (
      <View className={clsx("items-center justify-center py-16", className)}>
        <Text className="text-lg font-bold text-grey-900 mb-2">
          Aucune mission trouvée
        </Text>
        <Text className="text-sm text-grey-600 text-center max-w-sm">
          Essayez de modifier vos filtres ou votre recherche pour trouver des
          missions qui vous correspondent.
        </Text>
      </View>
    );
  }

  // --- Grille de cards ---
  return (
    <View
      className={clsx(
        "flex-row flex-wrap",
        CONTAINER_GAP,
        className,
      )}
    >
      {missions.map((mission) => (
        <View
          key={mission.id}
          className={ITEM_CLASS}
        >
          <MissionCard
            title={mission.title}
            description={mission.description}
            type={mission.type}
            associationName={mission.association.name}
            city={mission.address?.city ?? null}
            durationInt={mission.durationInt}
            frequency={mission.frequency}
            volunteersNeeded={mission.volunteersNeeded}
            startDate={mission.startDate}
            causes={mission.causes.map((c) => c.label)}
            volunteerTypes={mission.volunteerTypes.map((v) => v.label)}
            onPress={
              onMissionPress
                ? () => onMissionPress(mission.id)
                : undefined
            }
          />
        </View>
      ))}
    </View>
  );
}
