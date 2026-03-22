import { Pressable, View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { MissionHistoryItemProps } from "./mission-history-item.types";

import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import ChevronRightIconSource from "@assets/icons/ic_chevron_right.svg";

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
const ChevronRightIcon = cssInterop(ChevronRightIconSource, iconConfig);

const typeConfig = {
  MISSION: {
    bgClass: "bg-green-50",
    iconClass: "text-green-700",
    // Hover/active dans le thème vert
    hoverClass: "hover:bg-green-100 hover:border-green-200",
    activeClass: "active:bg-green-300 active:border-green-500",
    Icon: HandHeartIcon,
  },
  EVENT: {
    bgClass: "bg-blue-50",
    iconClass: "text-blue-700",
    // Hover/active dans le thème bleu
    hoverClass: "hover:bg-blue-100 hover:border-blue-200",
    activeClass: "active:bg-blue-300 active:border-blue-500",
    Icon: CalendarIcon,
  },
  COLLECT: {
    bgClass: "bg-badge-orange-bg",
    iconClass: "text-badge-orange-text",
    // Hover/active dans le thème orange
    hoverClass: "hover:bg-white-hover hover:border-primary",
    activeClass: "active:bg-white-active active:border-primary",
    Icon: BoxIcon,
  },
  INFO: {
    bgClass: "bg-grey-100",
    iconClass: "text-grey-700",
    // Hover/active dans le thème gris
    hoverClass: "hover:bg-grey-200 hover:border-grey-300",
    activeClass: "active:bg-grey-300 active:border-grey-500",
    Icon: InfoIcon,
  },
};

/**
 * Item d'historique représentant une participation à une mission.
 *
 * La couleur et l'icône s'adaptent automatiquement au type de mission :
 * - `MISSION` : vert   — mission de bénévolat  (ic_hand_heart)
 * - `EVENT`   : bleu   — événement             (ic_calendar)
 * - `COLLECT` : orange — collecte de dons      (ic_box)
 * - `INFO`    : gris   — information           (ic_info)
 *
 * Les états hover et active sont dans le thème couleur du type de mission.
 *
 * @example
 * <MissionHistoryItem
 *   title="Nettoyage des berges"
 *   associationName="Green Rhône"
 *   date="2024-10-12"
 *   type="MISSION"
 *   onPress={() => router.push(`/missions/1`)}
 * />
 */
export function MissionHistoryItem({
  title,
  associationName,
  date,
  type,
  onPress,
  className,
}: MissionHistoryItemProps) {
  const { bgClass, iconClass, hoverClass, activeClass, Icon } =
    typeConfig[type];

  const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={clsx(
        "flex-row items-center gap-4 p-4 rounded-lg bg-white",
        "border border-grey-100",
        // Interactions colorées selon le type
        onPress && [
          hoverClass,
          activeClass,
          "web:cursor-pointer",
          "web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        ],
        className,
      )}
    >
      {/* Icône type */}
      <View
        className={clsx(
          "w-10 h-10 rounded-lg items-center justify-center",
          bgClass,
        )}
      >
        <Icon className={clsx("w-5 h-5", iconClass)} />
      </View>

      {/* Contenu */}
      <View className="flex-1">
        <Text className="text-sm font-bold text-grey-900" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-grey-500 mt-0.5">
          {associationName} • {formattedDate}
        </Text>
      </View>

      {/* Chevron si cliquable */}
      {onPress && <ChevronRightIcon className="w-4 h-4 text-grey-400" />}
    </Pressable>
  );
}
