import React, { useState } from "react";
import { View, TouchableOpacity, Modal, Pressable } from "react-native";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { MissionStatusBadge } from "@/components/ui/mission-status-badge/MissionStatusBadge";
import type {
  MissionDashboardCardProps,
  MissionQuickAction,
} from "./MissionDashboardCard.types";

import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import UsersIconSource from "@assets/icons/ic_users.svg";
import EditIconSource from "@assets/icons/ic_edit.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";
import MenuVerticalIconSource from "@assets/icons/ic_more_vertical.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const UsersIcon = cssInterop(UsersIconSource, iconConfig);
const EditIcon = cssInterop(EditIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);
const MenuVerticalIcon = cssInterop(MenuVerticalIconSource, iconConfig);

const ACTIVITY_LABELS: Record<string, string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Information",
};

function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type QuickActionConfig = {
  label: string;
  action: MissionQuickAction;
  destructive?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
};

function getQuickActions(status: string): QuickActionConfig[] {
  if (status === "ARCHIVED") {
    return [{ label: "Désarchiver", action: "unarchive", Icon: UnlockIcon }];
  }
  return [
    { label: "Modifier", action: "edit", Icon: EditIcon },
    { label: "Archiver", action: "archive", Icon: BoxIcon },
    { label: "Supprimer", action: "delete", destructive: true, Icon: TrashIcon },
  ];
}

export function MissionDashboardCard({
  mission,
  onPress,
  onQuickAction,
}: MissionDashboardCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const quickActions = getQuickActions(mission.status);

  const startFmt = formatDate(mission.startDate);
  const endFmt = formatDate(mission.endDate);

  let dateText = "Sans date";
  if (startFmt && endFmt) dateText = `${startFmt} → ${endFmt}`;
  else if (startFmt) dateText = `Dès le ${startFmt}`;
  else if (endFmt) dateText = `Jusqu'au ${endFmt}`;

  const showLocation = mission.type !== "INFO";
  const locationText =
    mission.availabilityType === "REMOTE"
      ? "À distance"
      : (mission.address?.city ?? "Lieu non défini");

  const handleAction = (action: MissionQuickAction) => {
    setMenuVisible(false);
    onQuickAction?.(action);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl border border-grey-100 p-4 mb-3 shadow-sm"
      accessibilityRole="button"
    >
      {/* En-tête : titre + menu */}
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="flex-1 font-semibold text-grey-900 text-base mr-2"
          numberOfLines={2}
        >
          {mission.title}
        </Text>
        {!!onQuickAction && (
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            className="p-1"
            accessibilityLabel="Actions"
          >
            <MenuVerticalIcon className="w-5 h-5 text-grey-500" />
          </TouchableOpacity>
        )}
      </View>

      {/* Statut + type */}
      <View className="flex-row items-center gap-2 mb-3 flex-wrap">
        <MissionStatusBadge status={mission.status} size="sm" />
        <View className="bg-grey-50 border border-grey-100 rounded-full px-2 py-0.5">
          <Text className="text-xs text-grey-600">
            {ACTIVITY_LABELS[mission.type] ?? mission.type}
          </Text>
        </View>
      </View>

      {/* Infos */}
      <View className="gap-1.5">
        {mission.type !== "INFO" && (
          <View className="flex-row items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-grey-400" />
            <Text className="text-sm text-grey-600 flex-1">{dateText}</Text>
          </View>
        )}
        {showLocation && (
          <View className="flex-row items-center gap-2">
            <LocalisationIcon className="w-4 h-4 text-grey-400" />
            <Text className="text-sm text-grey-600 flex-1">{locationText}</Text>
          </View>
        )}
        {mission.hasRegistration && mission.type !== "INFO" && (
          <View className="flex-row items-center gap-2">
            <UsersIcon className="w-4 h-4 text-grey-400" />
            <Text className="text-sm text-grey-600 flex-1">
              {mission.participantsCount}
              {mission.volunteersNeeded
                ? ` / ${mission.volunteersNeeded} participants`
                : " participants"}
            </Text>
          </View>
        )}
      </View>

      {/* Menu contextuel */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/30"
          onPress={() => setMenuVisible(false)}
        >
          <View className="absolute right-4 top-1/3 bg-white rounded-xl shadow-lg overflow-hidden min-w-[200px]">
            {quickActions.map((item) => {
              const Icon = item.Icon;
              return (
                <TouchableOpacity
                  key={item.action}
                  onPress={() => handleAction(item.action)}
                  className="px-4 py-3 border-b border-grey-50 last:border-0 flex-row items-center gap-3"
                >
                  <Icon
                    className={`w-4 h-4 ${
                      item.destructive ? "text-red-600" : "text-grey-700"
                    }`}
                  />
                  <Text
                    className={`text-base ${
                      item.destructive ? "text-red-600" : "text-grey-800"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}
