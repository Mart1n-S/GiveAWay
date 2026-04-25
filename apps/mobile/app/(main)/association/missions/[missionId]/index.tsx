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
import { MissionParticipantCard } from "@/components/ui/mission-participant-card/mission-participant-card";
import { ParticipantProfileModal } from "@/components/ui/participant-profile-modal/participant-profile-modal";
import { colors } from "@/components/ui/theme/tokens";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { AssociationMissionItem, MissionParticipantProfile, MissionParticipantsResponse } from "@repo/shared";

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

  const [participantsData, setParticipantsData] = useState<MissionParticipantsResponse | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<MissionParticipantProfile | null>(null);
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

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
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [associationId, id],
  );

  const loadParticipants = useCallback(async () => {
    if (!associationId || !id) return;
    setParticipantsLoading(true);
    try {
      const data = await AssociationMissionService.getParticipants(associationId, id);
      setParticipantsData(data);
    } catch {
      // error already shown by service
    } finally {
      setParticipantsLoading(false);
    }
  }, [associationId, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (mission?.hasRegistration) {
      loadParticipants();
    }
  }, [mission?.hasRegistration, loadParticipants]);

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
        visibilityTime: 10000,
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

  const handleRemoveParticipant = async (userId: number) => {
    if (!associationId || !id) return;
    setRemoveLoading(true);
    setRemoveTarget(null);
    try {
      await AssociationMissionService.removeParticipant(associationId, id, userId);
      Toast.show({
        type: "success",
        text1: "Participant retiré",
        text2: "Un email de notification lui a été envoyé.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      await Promise.all([load(), loadParticipants()]);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: err instanceof Error ? err.message : "Impossible de retirer ce participant.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleHeaderBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.navigate("/association/missions" as any);
  }, [router]);

  const renderHeaderLeft = useCallback(
    () => <MissionDetailHeaderLeft onBack={handleHeaderBack} />,
    [handleHeaderBack],
  );

  const renderParticipants = () => {
    if (participantsLoading) {
      return (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary.default} />
        </View>
      );
    }
    if (participantsData?.participants.length === 0) {
      return (
        <View className="items-center gap-2 p-6 bg-white border rounded-xl border-grey-100">
          <UsersIcon className="w-8 h-8 text-grey-300" />
          <Text className="text-sm text-center text-grey-500">
            Aucun bénévole inscrit pour le moment.
          </Text>
        </View>
      );
    }
    return participantsData?.participants.map((p) => (
      <MissionParticipantCard
        key={p.userId}
        participant={p}
        canRemove={participantsData.canRemove}
        onRemove={(userId) => setRemoveTarget(userId)}
        onViewProfile={(participant) => setSelectedParticipant(participant)}
      />
    ));
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
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!mission) {
    return (
      <View className="items-center justify-center flex-1 gap-4 px-6">
        <Text className="text-base text-center text-grey-500">
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
          headerLeft: Platform.OS === "web" ? undefined : renderHeaderLeft,
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
          <View className="w-full max-w-2xl gap-4 mx-auto">
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
            <View className="gap-3 p-4 bg-white border rounded-xl border-grey-100">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-xl font-bold text-grey-900">
                  {mission.title}
                </Text>
                <MissionStatusBadge status={mission.status} size="md" />
              </View>

              <View className="flex-row flex-wrap items-center gap-2">
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
            <View className="gap-2 p-4 bg-white border rounded-xl border-grey-100">
              <Text className="text-base font-semibold text-grey-900">
                Description
              </Text>
              <Text className="text-sm leading-5 text-grey-600">
                {mission.description}
              </Text>
            </View>

            {/* Infos */}
            {(showDates || showLocation || mission.hasRegistration) && (
              <View className="gap-3 p-4 bg-white border rounded-xl border-grey-100">
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
              <View className="gap-3 p-4 bg-white border rounded-xl border-grey-100">
                {mission.skills.length > 0 && (
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-grey-800">
                      Compétences
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {mission.skills.map((s) => (
                        <View
                          key={s.id}
                          className="px-3 py-1 rounded-full bg-badge-blue-bg"
                        >
                          <Text className="text-xs font-medium text-badge-blue-text">
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
                          className="px-3 py-1 rounded-full bg-badge-orange-bg"
                        >
                          <Text className="text-xs font-medium text-badge-orange-text">
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
              <View className="gap-2 p-4 border border-orange-200 bg-orange-50 rounded-xl">
                {mission.warnings.map((w) => (
                  <View key={w} className="flex-row items-start gap-2">
                    <WarningIcon className="w-4 h-4 text-orange-600 mt-0.5" />
                    <Text className="flex-1 text-sm text-orange-700">{w}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Section participants */}
            {mission.hasRegistration && (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-grey-900">
                    Participants
                    {participantsData != null && (
                      <Text className="font-normal text-grey-500">
                        {" "}({participantsData.total})
                      </Text>
                    )}
                  </Text>
                  {!participantsData?.canRemove && (
                    <View className="bg-grey-100 rounded-full px-2 py-0.5">
                      <Text className="text-xs text-grey-500">Lecture seule</Text>
                    </View>
                  )}
                </View>

                {renderParticipants()}
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

      {removeTarget != null && (
        <ConfirmModal
          visible
          title="Retirer ce bénévole ?"
          message="Le bénévole sera retiré de la mission et recevra un email de notification."
          confirmLabel="Retirer"
          cancelLabel="Annuler"
          destructive
          loading={removeLoading}
          onConfirm={() => handleRemoveParticipant(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      <ParticipantProfileModal
        participant={selectedParticipant}
        canRemove={participantsData?.canRemove ?? false}
        onRemove={(userId: number) => {
          setSelectedParticipant(null);
          setRemoveTarget(userId);
        }}
        onClose={() => setSelectedParticipant(null)}
      />
    </>
  );
}
