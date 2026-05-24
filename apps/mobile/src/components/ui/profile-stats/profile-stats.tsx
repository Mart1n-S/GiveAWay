import { useMemo } from "react";
import { View, Pressable } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { ProfileStatsProps } from "./profile-stats.types";

// Plafond d'affichage des compteurs profil — au-delà on affiche "100+"
// pour éviter les libellés trop larges sur mobile.
const STATS_DISPLAY_CAP = 100;
const formatCount = (n: number): string =>
  n >= STATS_DISPLAY_CAP ? `${STATS_DISPLAY_CAP}+` : n.toString();

export function ProfileStats({ user, className, onFollowsPress, onHelpedPress }: ProfileStatsProps) {
  const followsCount = user.followsCount ?? 0;

  // Backend renseigne participationsCount / helpedAssociationsCount sur toutes
  // les participations. Fallback sur user.participations.length pour compat
  // (mais cette liste est capée à 5 par l'aperçu historique, d'où l'écart
  // précédent entre profil et page "Associations aidées").
  const missionCount = useMemo(() => {
    if (typeof user.participationsCount === "number") return user.participationsCount;
    return user.participations?.length ?? 0;
  }, [user.participationsCount, user.participations]);

  const helpedAssociationsCount = useMemo(() => {
    if (typeof user.helpedAssociationsCount === "number") return user.helpedAssociationsCount;
    if (!user.participations?.length) return 0;
    return new Set(user.participations.map((p) => p.mission.association.id)).size;
  }, [user.helpedAssociationsCount, user.participations]);

  return (
    <View className={clsx("flex-col gap-3 md:flex-row md:gap-4", className)}>
      <StatCard
        label="Missions"
        value={formatCount(missionCount)}
        className="w-full md:flex-1"
      />

      <StatCard
        label="Associations aidées"
        value={formatCount(helpedAssociationsCount)}
        className="w-full md:flex-1"
        onPress={onHelpedPress}
      />

      <StatCard
        label="Abonnements"
        value={formatCount(followsCount)}
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
