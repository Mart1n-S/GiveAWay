import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { MissionStatusBadge } from "@/components/ui/mission-status-badge/MissionStatusBadge";
import { MissionActionBar } from "@/components/ui/mission-action-bar/MissionActionBar";
import { ConfirmModal } from "@/components/ui/confirm-modal/ConfirmModal";
import { colors } from "@/components/ui/theme/tokens";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { AssociationMissionItem } from "@repo/shared";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import ClockIconSource from "@assets/icons/ic_clock.svg";
import UsersIconSource from "@assets/icons/ic_users.svg";
import WarningIconSource from "@assets/icons/ic_warning.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const ClockIcon = cssInterop(ClockIconSource, iconConfig);
const UsersIcon = cssInterop(UsersIconSource, iconConfig);
const WarningIcon = cssInterop(WarningIconSource, iconConfig);

function MissionDetailHeaderLeft({ onBack }: { readonly onBack: () => void }) {
  return (
    <TouchableOpacity
      onPress={onBack}
      style={{ padding: 8, marginLeft: 4 }}
      accessibilityLabel="Retour"
    >
      <ArrowLeftIcon style={{ width: 24, height: 24, color: colors.primary.default }} />
    </TouchableOpacity>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Information",
};

const FREQUENCY_LABELS: Record<string, string> = {
  ONCE: "Ponctuelle",
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuelle",
};

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type ConfirmAction = "archive" | "unarchive" | "delete";

export default function MissionDetailScreen() {
  const router = useRouter();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  usePageTitle("Mission");

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;

  const [mission, setMission] = useState<AssociationMissionItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const id = Number(missionId);

  const load = useCallback(
    async (refresh = false) => {
      if (!associationId || !id) return;
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const data = await AssociationMissionService.getOne(associationId, id);
        setMission(data);
      } catch {
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: "Impossible de charger la mission.",
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [associationId, id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: ConfirmAction) => {
    if (!associationId || !id) return;
    setActionLoading(true);
    setConfirmAction(null);
    try {
      if (action === "archive") {
        await AssociationMissionService.archive(associationId, id);
      } else if (action === "unarchive") {
        await AssociationMissionService.unarchive(associationId, id);
      } else {
        await AssociationMissionService.deleteMission(associationId, id);
        router.replace("/association/missions" as any);
        return;
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
      setActionLoading(false);
    }
  };

  const CONFIRM_CONFIG: Record<
    ConfirmAction,
    { title: string; message: string; label: string; destructive: boolean }
  > = {
    archive: {
      title: "Archiver la mission ?",
      message: "La mission sera archivée et ne sera plus visible publiquement.",
      label: "Archiver",
      destructive: false,
    },
    unarchive: {
      title: "Désarchiver la mission ?",
      message: "La mission redeviendra active et visible publiquement.",
      label: "Désarchiver",
      destructive: false,
    },
    delete: {
      title: "Supprimer la mission ?",
      message: "Cette action est irréversible. Les participants inscrits seront notifiés par email.",
      label: "Supprimer",
      destructive: true,
    },
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!mission) {
    return (
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-base text-grey-500 text-center">
          Mission introuvable.
        </Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Retour
        </Button>
      </View>
    );
  }

  const isInfo = mission.type === "INFO";
  const showLocation = !isInfo;
  const showDates = !isInfo;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: mission.title,
          headerShown: Platform.OS !== "web",
          headerLeft: Platform.OS !== "web"
            ? () => (
                <MissionDetailHeaderLeft
                  onBack={() =>
                    router.canGoBack()
                      ? router.back()
                      : router.navigate("/association/missions" as any)
                  }
                />
              )
            : undefined,
        }}
      />
      <View className="flex-1 bg-grey-50">
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load(true)}
              colors={[colors.primary.default]}
              tintColor={colors.primary.default}
            />
          }
        >
          <View className="gap-4 max-w-2xl w-full mx-auto">
            {Platform.OS === "web" && (
              <Button
                variant="secondary"
                onPress={() => router.back()}
                className="self-start"
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
              </Button>
            )}

            {/* Header card */}
            <View className="bg-white rounded-xl border border-grey-100 p-4 gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-xl font-bold text-grey-900">
                  {mission.title}
                </Text>
                <MissionStatusBadge status={mission.status} size="md" />
              </View>

              <View className="flex-row items-center gap-2 flex-wrap">
                <View className="bg-grey-50 border border-grey-100 rounded-full px-2 py-0.5">
                  <Text className="text-xs text-grey-600">
                    {ACTIVITY_LABELS[mission.type] ?? mission.type}
                  </Text>
                </View>
                {mission.frequency && (
                  <View className="bg-grey-50 border border-grey-100 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-grey-600">
                      {FREQUENCY_LABELS[mission.frequency] ?? mission.frequency}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            <View className="bg-white rounded-xl border border-grey-100 p-4 gap-2">
              <Text className="text-base font-semibold text-grey-900">
                Description
              </Text>
              <Text className="text-sm text-grey-600 leading-5">
                {mission.description}
              </Text>
            </View>

            {/* Infos */}
            {(showDates || showLocation || mission.hasRegistration) && (
              <View className="bg-white rounded-xl border border-grey-100 p-4 gap-3">
                <Text className="text-base font-semibold text-grey-900">
                  Informations
                </Text>
                <View className="gap-2">
                  {showDates && (
                    <>
                      <View className="flex-row items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-grey-400" />
                        <Text className="text-sm text-grey-600">
                          Début : {formatDate(mission.startDate)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-grey-400" />
                        <Text className="text-sm text-grey-600">
                          Fin : {formatDate(mission.endDate)}
                        </Text>
                      </View>
                    </>
                  )}
                  {mission.durationInt && (
                    <View className="flex-row items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-grey-400" />
                      <Text className="text-sm text-grey-600">
                        Durée : {formatDuration(mission.durationInt)}
                      </Text>
                    </View>
                  )}
                  {showLocation && (
                    <View className="flex-row items-center gap-2">
                      <LocalisationIcon className="w-4 h-4 text-grey-400" />
                      <Text className="text-sm text-grey-600">
                        {mission.availabilityType === "REMOTE"
                          ? "À distance"
                          : (mission.address?.city ?? "Lieu non défini")}
                      </Text>
                    </View>
                  )}
                  {mission.hasRegistration && (
                    <View className="flex-row items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-grey-400" />
                      <Text className="text-sm text-grey-600">
                        {mission.participantsCount}
                        {mission.volunteersNeeded
                          ? ` / ${mission.volunteersNeeded} bénévoles`
                          : " participants"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Tags */}
            {(mission.skills.length > 0 || mission.causes.length > 0) && (
              <View className="bg-white rounded-xl border border-grey-100 p-4 gap-3">
                {mission.skills.length > 0 && (
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-grey-800">
                      Compétences
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {mission.skills.map((s) => (
                        <View
                          key={s.id}
                          className="bg-badge-blue-bg rounded-full px-3 py-1"
                        >
                          <Text className="text-xs text-badge-blue-text font-medium">
                            {s.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {mission.causes.length > 0 && (
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-grey-800">
                      Causes
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {mission.causes.map((c) => (
                        <View
                          key={c.id}
                          className="bg-badge-orange-bg rounded-full px-3 py-1"
                        >
                          <Text className="text-xs text-badge-orange-text font-medium">
                            {c.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Warnings */}
            {mission.warnings && mission.warnings.length > 0 && (
              <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 gap-2">
                {mission.warnings.map((w) => (
                  <View key={w} className="flex-row items-start gap-2">
                    <WarningIcon className="w-4 h-4 text-orange-600 mt-0.5" />
                    <Text className="flex-1 text-sm text-orange-700">{w}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <MissionActionBar
          status={mission.status}
          isLoading={actionLoading}
          onEdit={() => router.push(`/association/missions/${id}/modifier` as any)}
          onArchive={() => setConfirmAction("archive")}
          onUnarchive={() => setConfirmAction("unarchive")}
          onDelete={() => setConfirmAction("delete")}
        />
      </View>

      {confirmAction && (
        <ConfirmModal
          visible
          title={CONFIRM_CONFIG[confirmAction].title}
          message={CONFIRM_CONFIG[confirmAction].message}
          confirmLabel={CONFIRM_CONFIG[confirmAction].label}
          cancelLabel="Annuler"
          destructive={CONFIRM_CONFIG[confirmAction].destructive}
          loading={actionLoading}
          onConfirm={() => runAction(confirmAction)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
