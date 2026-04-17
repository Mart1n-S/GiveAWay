import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { MissionCard } from "../mission-card/mission-card";
import type { MissionListItem } from "@repo/shared";
import { AssociationMissionHistoryProps } from "./AssociationMissionHistory.types";

/**
 * Section affichant les dernières missions actives d'une association.
 *
 * - État chargement : 3 placeholders skeleton
 * - État vide : message dédié
 * - État erreur : message + bouton réessayer
 * - Bouton "Voir toutes les missions →" en bas
 *
 * Le parent est responsable du chargement des missions via le service approprié.
 */
export function AssociationMissionHistory({
  missions,
  loading = false,
  error,
  onRetry,
  onViewAll,
}: AssociationMissionHistoryProps) {
  const router = useRouter();

  return (
    <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
      <Text className="text-base font-bold text-grey-900">
        Missions récentes
      </Text>

      {loading && (
        <View className="gap-3">
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-32 bg-grey-100 rounded-xl" />
          ))}
        </View>
      )}

      {!loading && !!error && (
        <View className="items-center gap-3 py-4">
          <Text className="text-sm text-center text-grey-500">{error}</Text>
          {onRetry && (
            <Button variant="tertiary" onPress={onRetry}>
              Réessayer
            </Button>
          )}
        </View>
      )}

      {!loading && !error && missions.length === 0 && (
        <View className="items-center py-4">
          <Text className="text-sm text-center text-grey-500">
            Aucune mission pour le moment.
          </Text>
        </View>
      )}

      {!loading && !error && missions.length > 0 && (
        <View className="gap-3">
          {missions.map((mission: MissionListItem) => (
            <MissionCard
              key={mission.id}
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
              volunteerTypes={mission.volunteerTypes.map((vt) => vt.label)}
              onPress={() => router.push(`/missions/${mission.id}` as any)}
            />
          ))}
        </View>
      )}

      {!loading && !error && (
        <Button variant="tertiary" onPress={onViewAll}>
          Voir toutes les missions →
        </Button>
      )}
    </View>
  );
}
