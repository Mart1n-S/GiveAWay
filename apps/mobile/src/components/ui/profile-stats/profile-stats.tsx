import { useMemo } from "react";
import { View, Pressable } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { ProfileStatsProps } from "./profile-stats.types";

export function ProfileStats({ user, className, onFollowsPress, onHelpedPress }: ProfileStatsProps) {
  const missionCount = user.participations?.length ?? 0;
  const followsCount = user.followsCount ?? 0;

  const helpedAssociationsCount = useMemo(() => {
    if (!user.participations?.length) return 0;
    return new Set(user.participations.map((p) => p.mission.association.id)).size;
  }, [user.participations]);

  return (
    <View className={clsx("flex-col gap-3 md:flex-row md:gap-4", className)}>
      <StatCard
        label="Missions"
        value={missionCount.toString()}
        className="w-full md:flex-1"
      />

      <StatCard
        label="Associations aidées"
        value={helpedAssociationsCount.toString()}
        className="w-full md:flex-1"
        onPress={onHelpedPress}
      />

      <StatCard
        label="Abonnements"
        value={followsCount.toString()}
        className="w-full md:flex-1"
        onPress={onFollowsPress}
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  className,
  onPress,
}: {
  label: string;
  value: string;
  className?: string;
  onPress?: () => void;
}) {
  const baseClass = clsx(
    "p-4 rounded-lg bg-white border border-grey-100",
    "shadow-sm items-center justify-center",
    className,
  );

  if (onPress) {
    return (
      <Pressable className={clsx(baseClass, "active:bg-grey-50")} onPress={onPress}>
        <Text className="text-2xl font-bold text-grey-900">{value}</Text>
        <Text className="mt-1 text-xs font-medium tracking-tight uppercase text-grey-500">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className={baseClass}>
      <Text className="text-2xl font-bold text-grey-900">{value}</Text>
      <Text className="mt-1 text-xs font-medium tracking-tight uppercase text-grey-500">
        {label}
      </Text>
    </View>
  );
}
