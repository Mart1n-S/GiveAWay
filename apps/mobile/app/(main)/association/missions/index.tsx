import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { SearchInput } from "@/components/ui/search-input/SearchInput";
import { ConfirmModal } from "@/components/ui/confirm-modal/ConfirmModal";
import { colors } from "@/components/ui/theme/tokens";
import { MissionDashboardTabs } from "@/components/ui/mission-dashboard-tabs/MissionDashboardTabs";
import { MissionDashboardCard } from "@/components/ui/mission-dashboard-card/MissionDashboardCard";
import { MissionEmptyState } from "@/components/ui/mission-empty-state/MissionEmptyState";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import { usePageTitle } from "@/hooks/usePageTitle";
import type {
  AssociationMissionDashboard,
  AssociationMissionItem,
  MissionDashboardTab,
} from "@repo/shared";
import type { MissionQuickAction } from "@/components/ui/mission-dashboard-card/MissionDashboardCard.types";

import AddIconSource from "@assets/icons/ic_add.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const AddIcon = cssInterop(AddIconSource, iconConfig);

function MissionsHeaderRight({ onPress }: { readonly onPress: () => void }) {
  return (
    <Button
      onPress={onPress}
      className="px-3 mr-2 h-9"
      icon={<AddIcon className="w-4 h-4 text-white" />}
    >
      Créer
    </Button>
  );
}

const EMPTY_COUNTS: AssociationMissionDashboard["counts"] = {
  active: 0,
  upcoming: 0,
  past: 0,
  archived: 0,
};

export default function MissionsDashboardScreen() {
  const router = useRouter();
  usePageTitle("Gestion des missions");

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;

  const [dashboard, setDashboard] = useState<AssociationMissionDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<MissionDashboardTab>("active");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [confirmPending, setConfirmPending] = useState<{
    mission: AssociationMissionItem;
    action: "archive" | "delete";
  } | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!associationId) return;
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const data = await AssociationMissionService.getDashboard(associationId);
        setDashboard(data);
      } catch {
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: "Impossible de charger les missions.",
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [associationId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleQuickAction = (
    mission: AssociationMissionItem,
    action: MissionQuickAction,
  ) => {
    if (!associationId) return;

    if (action === "edit") {
      router.push(`/association/missions/${mission.id}/modifier` as any);
      return;
    }

    if (action === "archive" || action === "delete") {
      setConfirmPending({ mission, action });
      return;
    }

    runAction(mission, action);
  };

  const runAction = async (
    mission: AssociationMissionItem,
    action: "archive" | "unarchive" | "delete",
  ) => {
    if (!associationId) return;
    setActionLoadingId(mission.id);
    try {
      if (action === "archive") {
        await AssociationMissionService.archive(associationId, mission.id);
      } else if (action === "unarchive") {
        await AssociationMissionService.unarchive(associationId, mission.id);
      } else if (action === "delete") {
        await AssociationMissionService.deleteMission(associationId, mission.id);
      }
      Toast.show({
        type: "success",
        text1: action === "unarchive" ? "Mission désarchivée" : "Action effectuée",
        visibilityTime: 3000,
        onPress: () => Toast.hide(),
      });
      await load();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: err instanceof Error ? err.message : "Action impossible.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const missions = dashboard?.missions[activeTab] ?? [];
  const counts = dashboard?.counts ?? EMPTY_COUNTS;

  const filteredMissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return missions;
    return missions.filter((m) =>
      m.title.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term),
    );
  }, [missions, search]);

  if (!associationId) {
    return (
      <View className="items-center justify-center flex-1 px-6">
        <Text className="text-base text-center text-grey-500">
          Vous n'êtes membre d'aucune association.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Gestion des missions",
          headerShown: Platform.OS !== "web",
          headerRight: () => (
            <MissionsHeaderRight
              onPress={() => router.push("/association/missions/creer" as any)}
            />
          ),
        }}
      />
      <View className="flex-1 bg-grey-50">
        <View className="bg-white border-b border-grey-100">
          {Platform.OS === "web" && (
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <Text className="text-xl font-bold text-grey-900">Gestion des missions</Text>
              <Button
                onPress={() => router.push("/association/missions/creer" as any)}
                className="px-3 h-9"
                icon={<AddIcon className="w-4 h-4 text-white" />}
              >
                Créer
              </Button>
            </View>
          )}
          <View className="px-4 pb-3">
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher une mission…"
            />
          </View>

          <MissionDashboardTabs
            activeTab={activeTab}
            counts={counts}
            onChange={setActiveTab}
          />
        </View>

        <FlatList
          data={filteredMissions}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MissionDashboardCard
              mission={item}
              onPress={() =>
                router.push(`/association/missions/${item.id}` as any)
              }
              onQuickAction={
                actionLoadingId === item.id
                  ? undefined
                  : (action) => handleQuickAction(item, action)
              }
            />
          )}
          ListEmptyComponent={
            search.trim() ? (
              <View className="items-center justify-center px-8 py-16">
                <Text className="text-base text-center text-grey-500">
                  Aucune mission ne correspond à « {search} ».
                </Text>
              </View>
            ) : (
              <MissionEmptyState
                tab={activeTab}
                onCreatePress={() =>
                  router.push("/association/missions/creer" as any)
                }
              />
            )
          }
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load(true)}
              colors={[colors.primary.default]}
              tintColor={colors.primary.default}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {confirmPending && (
        <ConfirmModal
          visible
          title={
            confirmPending.action === "delete"
              ? "Supprimer la mission ?"
              : "Archiver la mission ?"
          }
          message={
            confirmPending.action === "delete"
              ? "Cette action est irréversible. Les participants inscrits seront notifiés par email."
              : "La mission sera archivée et ne sera plus visible publiquement."
          }
          confirmLabel={confirmPending.action === "delete" ? "Supprimer" : "Archiver"}
          cancelLabel="Annuler"
          destructive={confirmPending.action === "delete"}
          loading={actionLoadingId === confirmPending.mission.id}
          onConfirm={() => {
            const { mission, action } = confirmPending;
            setConfirmPending(null);
            runAction(mission, action);
          }}
          onCancel={() => setConfirmPending(null)}
        />
      )}
    </>
  );
}
