import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { ProfileStatsProps } from "./profile-stats.types";

/**
 * Carte de statistiques d'engagement du bénévole.
 *
 * Affiche en grille :
 * - Nombre de missions effectuées
 * - Nombre d'heures de bénévolat (calculé à partir des participations)
 *
 * @example
 * <ProfileStats user={user} />
 */
export function ProfileStats({ user, className }: ProfileStatsProps) {
  const missionCount = user.participations?.length ?? 0;

  return (
    <View className={clsx("flex-row gap-4", className)}>
      {/* Missions */}
      <StatCard
        label="Missions"
        value={missionCount.toString()}
        className="flex-1"
      />

      {/* Associations */}
      <StatCard
        label="Associations"
        value={(user.associations?.length ?? 0).toString()}
        className="flex-1"
      />
    </View>
  );
}

// Composant interne

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <View
      className={clsx(
        "p-4 rounded-lg bg-white border border-grey-100",
        "shadow-sm items-center justify-center",
        className,
      )}
    >
      <Text className="text-2xl font-bold text-grey-900">{value}</Text>
      <Text className="mt-1 text-xs font-medium tracking-tight uppercase text-grey-500">
        {label}
      </Text>
    </View>
  );
}