import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { MissionCounterProps } from "./mission-counter.types";

/**
 * Compteur affichant le nombre total de missions disponibles.
 */
export function MissionCounter({
  total,
  isLoading,
  className,
}: MissionCounterProps) {
  return (
    <View className={clsx("flex-row items-baseline gap-2", className)}>
      <Text className="text-2xl font-bold text-grey-900">
        {isLoading ? "..." : total}
      </Text>
      <Text className="text-base text-grey-600">
        {total <= 1 ? "mission disponible" : "missions disponibles"}
      </Text>
    </View>
  );
}
