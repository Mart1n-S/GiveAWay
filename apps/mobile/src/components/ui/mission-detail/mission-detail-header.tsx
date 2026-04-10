import { Platform, View } from "react-native";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { TagBadge } from "../tag-badge/tag-badge";
import { Button } from "../button/button";
import { MissionDetailHeaderProps } from "./mission-detail-header.types";
import type { ActivityType } from "@repo/shared";

import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);

const TYPE_CONFIG: Record<
  ActivityType,
  {
    label: string;
    badgeVariant: "green" | "blue" | "orange" | "surface";
    bgClass: string;
    iconClass: string;
    Icon: ReturnType<typeof cssInterop>;
  }
> = {
  MISSION: {
    label: "Mission",
    badgeVariant: "green",
    bgClass: "bg-green-50",
    iconClass: "text-green-700",
    Icon: HandHeartIcon,
  },
  EVENT: {
    label: "Événement",
    badgeVariant: "blue",
    bgClass: "bg-blue-50",
    iconClass: "text-blue-700",
    Icon: CalendarIcon,
  },
  COLLECT: {
    label: "Collecte",
    badgeVariant: "orange",
    bgClass: "bg-badge-orange-bg",
    iconClass: "text-badge-orange-text",
    Icon: BoxIcon,
  },
  INFO: {
    label: "Info",
    badgeVariant: "surface",
    bgClass: "bg-grey-100",
    iconClass: "text-grey-700",
    Icon: InfoIcon,
  },
};

/**
 * En-tête de la page de détail d'une mission.
 * Affiche : bouton retour (web), icône type, badge, titre.
 * Sur mobile, le bouton retour est géré par le header natif Stack.
 */
export function MissionDetailHeader({
  title,
  type,
  onBack,
}: MissionDetailHeaderProps) {
  const { label, badgeVariant, bgClass, iconClass, Icon } = TYPE_CONFIG[type];
  const isWeb = Platform.OS === "web";

  return (
    <View className="mb-6">
      {/* Bouton retour — web uniquement */}
      {isWeb && (
        <View className="mb-4">
          <Button variant="secondary" onPress={onBack}>
            ← Retour
          </Button>
        </View>
      )}

      {/* Icône type + badge */}
      <View className="flex-row items-center gap-3 mb-4">
        <View
          className={`w-12 h-12 rounded-xl items-center justify-center ${bgClass}`}
        >
          <Icon className={`w-6 h-6 ${iconClass}`} />
        </View>
        <TagBadge label={label} variant={badgeVariant} size="md" />
      </View>

      {/* Titre */}
      <Text className="text-2xl font-bold text-grey-900 leading-tight">
        {title}
      </Text>
    </View>
  );
}
