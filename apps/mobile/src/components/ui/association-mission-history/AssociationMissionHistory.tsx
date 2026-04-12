import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { MissionCard } from "../mission-card/mission-card";
import { api } from "@/lib/axios";
import type { MissionListItem, MissionListResponse } from "@repo/shared";
import { AssociationMissionHistoryProps } from "./AssociationMissionHistory.types";

/**
 * Section affichant les 3 dernières missions actives d'une association.
 *
 * - État chargement : 3 placeholders skeleton
 * - État vide : message dédié
 * - État erreur : message + bouton réessayer
 * - Bouton "Voir toutes les missions →" en bas
 */
export function AssociationMissionHistory({
  associationId,
  onViewAll,
}: AssociationMissionHistoryProps) {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<MissionListResponse>(
        `/associations/missions/${associationId}`,
        {
          params: {
            pageSize: "3",
            page: "1",
          },
        },
      );

      setMissions(data.missions.slice(0, 3));
    } catch {
      setError("Impossible de charger les missions.");
    } finally {
      setIsLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  return (
    <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
      <Text className="text-base font-bold text-grey-900">
        Missions récentes
      </Text>

      {isLoading && (
        <View className="gap-3">
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-32 bg-grey-100 rounded-xl" />
          ))}
        </View>
      )}

      {!isLoading && error && (
        <View className="items-center gap-3 py-4">
          <Text className="text-sm text-center text-grey-500">{error}</Text>
          <Button variant="tertiary" onPress={loadMissions}>
            Réessayer
          </Button>
        </View>
      )}

      {!isLoading && !error && missions.length === 0 && (
        <View className="items-center py-4">
          <Text className="text-sm text-center text-grey-500">
            Aucune mission pour le moment.
          </Text>
        </View>
      )}

      {!isLoading && !error && missions.length > 0 && (
        <View className="gap-3">
          {missions.map((mission) => (
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

      {!isLoading && !error && (
        <Button variant="tertiary" onPress={onViewAll}>
          Voir toutes les missions →
        </Button>
      )}
    </View>
  );
}
