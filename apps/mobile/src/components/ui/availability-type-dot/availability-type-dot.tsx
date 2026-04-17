import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { AvailabilityTypeDotProps } from "./availability-type-dot.types";

const typeConfig = {
  REMOTE: {
    label: "À distance",
    dotClass: "bg-blue-500",
  },
  ON_SITE: {
    label: "Sur site",
    dotClass: "bg-green-500",
  },
  HYBRID: {
    label: "Hybride",
    dotClass: "bg-primary",
  },
};

/**
 * Affiche le type de disponibilité avec un point coloré.
 *
 * - `REMOTE`  : point bleu  — à distance
 * - `ON_SITE` : point vert  — sur site
 * - `HYBRID`  : point orange — hybride (sur site + à distance)
 *
 * Pour `HYBRID`, deux badges sont affichés automatiquement
 * (Sur site + À distance) car l'utilisateur accepte les deux.
 *
 * @example
 * <AvailabilityTypeDot type="REMOTE" />
 * <AvailabilityTypeDot type="HYBRID" />
 */
export function AvailabilityTypeDot({
  type,
  className,
}: AvailabilityTypeDotProps) {
  // HYBRID : on affiche les deux types séparément
  if (type === "HYBRID") {
    return (
      <View className={clsx("flex-row flex-wrap gap-2", className)}>
        <TypePill
          dotClass={typeConfig.ON_SITE.dotClass}
          label={typeConfig.ON_SITE.label}
        />
        <TypePill
          dotClass={typeConfig.REMOTE.dotClass}
          label={typeConfig.REMOTE.label}
        />
      </View>
    );
  }

  const { dotClass, label } = typeConfig[type];

  return (
    <View className={clsx("flex-row flex-wrap gap-2", className)}>
      <TypePill dotClass={dotClass} label={label} />
    </View>
  );
}

// Composant interne

function TypePill({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-lg bg-grey-50">
      <View className={clsx("w-2 h-2 rounded-full", dotClass)} />
      <Text className="text-xs font-medium text-grey-800">{label}</Text>
    </View>
  );
}
